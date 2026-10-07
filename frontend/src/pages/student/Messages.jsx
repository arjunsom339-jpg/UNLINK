import { useState, useRef, useEffect } from 'react';
import {
  Search, Send, Paperclip, MoreVertical, Phone, Video,
  Users, Check, CheckCheck, Smile, Circle, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const INITIAL_CONVERSATIONS = [
  {
    id: 'conv-1',
    name: 'Ananya Deshmukh',
    role: 'Student • 6th Sem CSE',
    avatar: 'AD',
    color: '#6366f1',
    isOnline: true,
    isGroup: false,
    lastMessage: 'Sounds great! Let us finalize the SIH presentation slides by 7 PM.',
    lastTime: '10:42 AM',
    unreadCount: 1,
    messages: [
      { id: 'm1', sender: 'them', text: 'Hey! Did you review the problem statement for SIH 2026?', time: '10:30 AM' },
      { id: 'm2', sender: 'me',   text: 'Yes! The smart traffic signal optimization one looks very promising.', time: '10:35 AM' },
      { id: 'm3', sender: 'them', text: 'Awesome. I have drafted the tech stack architecture in Figma.', time: '10:38 AM' },
      { id: 'm4', sender: 'them', text: 'Sounds great! Let us finalize the SIH presentation slides by 7 PM.', time: '10:42 AM' },
    ]
  },
  {
    id: 'conv-2',
    name: 'Smart India Hackathon Team Alpha',
    role: 'Group • 5 Members',
    avatar: 'SIH',
    color: '#10b981',
    isOnline: true,
    isGroup: true,
    lastMessage: 'Rahul: Pushed initial FastAPI boiler plate to GitHub repo.',
    lastTime: '9:15 AM',
    unreadCount: 3,
    messages: [
      { id: 'm10', sender: 'them', senderName: 'Priya', text: 'Has everyone joined the Discord channel?', time: '8:45 AM' },
      { id: 'm11', sender: 'them', senderName: 'Rahul', text: 'Pushed initial FastAPI boiler plate to GitHub repo.', time: '9:15 AM' },
    ]
  },
  {
    id: 'conv-3',
    name: 'Karthik Raja (Skill Swap Partner)',
    role: 'Mentor • IoT & Embedded',
    avatar: 'KR',
    color: '#f59e0b',
    isOnline: false,
    isGroup: false,
    lastMessage: 'Sure, I can explain SPI vs I2C protocol tomorrow after 4th period lab.',
    lastTime: 'Yesterday',
    unreadCount: 0,
    messages: [
      { id: 'm20', sender: 'me',   text: 'Hi Karthik, had a quick question regarding ESP32 sensor interrupts.', time: 'Yesterday 3:15 PM' },
      { id: 'm21', sender: 'them', text: 'Sure, I can explain SPI vs I2C protocol tomorrow after 4th period lab.', time: 'Yesterday 4:00 PM' },
    ]
  },
  {
    id: 'conv-4',
    name: 'Dr. Ramesh Kumar (Faculty Mentor)',
    role: 'Faculty Mentor • R&D',
    avatar: 'RK',
    color: '#0ea5e9',
    isOnline: true,
    isGroup: false,
    lastMessage: 'Please submit your IEEE conference abstract draft by Wednesday.',
    lastTime: 'Oct 5',
    unreadCount: 0,
    messages: [
      { id: 'm30', sender: 'them', text: 'Please submit your IEEE conference abstract draft by Wednesday.', time: 'Oct 5 11:20 AM' },
    ]
  }
];

export default function Messages() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [selectedConvId, setSelectedConvId] = useState('conv-1');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [inputText, setInputText] = useState('');

  const messagesEndRef = useRef(null);

  const selectedConv = conversations.find((c) => c.id === selectedConvId) || conversations[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage = {
      id: `m-${Date.now()}`,
      sender: 'me',
      text: inputText.trim(),
      time: 'Just now'
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === selectedConvId) {
          return {
            ...c,
            lastMessage: `You: ${inputText.trim()}`,
            lastTime: 'Just now',
            unreadCount: 0,
            messages: [...c.messages, newMessage]
          };
        }
        return c;
      })
    );

    setInputText('');
  };

  const handleQuickSend = (text) => {
    const newMessage = {
      id: `m-${Date.now()}`,
      sender: 'me',
      text,
      time: 'Just now'
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === selectedConvId) {
          return {
            ...c,
            lastMessage: `You: ${text}`,
            lastTime: 'Just now',
            messages: [...c.messages, newMessage]
          };
        }
        return c;
      })
    );
  };

  const filteredConversations = conversations.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === 'direct') return matchSearch && !c.isGroup;
    if (filterType === 'groups') return matchSearch && c.isGroup;
    return matchSearch;
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - var(--topbar-height) - 48px)',
      gap: 16
    }}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
          Messages & Collaboration Chats
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Connect with team members, faculty advisors, and skill exchange partners.
        </p>
      </div>

      {/* ── Chat Shell ─────────────────────────────────────────── */}
      <div className="card" style={{
        flex: 1,
        padding: 0,
        display: 'flex',
        overflow: 'hidden',
        minHeight: 0
      }}>
        {/* ── Left Sidebar: Conversation List ──────────────────── */}
        <div style={{
          width: 340,
          borderRight: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)'
        }}>
          {/* Search Box */}
          <div style={{ padding: 14, borderBottom: '1px solid var(--border-default)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: 32, height: 36, fontSize: '0.85rem' }}
                placeholder="Search chats & people..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {['all', 'direct', 'groups'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`btn btn-sm ${filterType === type ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    textTransform: 'capitalize'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* List items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.map((c) => {
              const isSelected = c.id === selectedConvId;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedConvId(c.id);
                    // Clear unread
                    setConversations((prev) =>
                      prev.map((item) => item.id === c.id ? { ...item, unreadCount: 0 } : item)
                    );
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--color-primary-500)' : '3px solid transparent',
                    borderBottom: '1px solid var(--border-default)',
                    transition: 'background var(--transition-fast)'
                  }}
                >
                  {/* Avatar */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 'var(--radius-md)',
                      background: c.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.88rem'
                    }}>
                      {c.avatar}
                    </div>
                    {c.isOnline && (
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#10b981',
                        border: '2px solid var(--bg-surface)',
                        position: 'absolute',
                        bottom: -1,
                        right: -1
                      }} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                      <span style={{
                        fontWeight: isSelected ? 700 : 600,
                        fontSize: '0.88rem',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 160
                      }}>
                        {c.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {c.lastTime}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.78rem',
                        color: isSelected ? 'var(--text-secondary)' : 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 180
                      }}>
                        {c.lastMessage}
                      </span>

                      {c.unreadCount > 0 && (
                        <span style={{
                          background: 'var(--color-primary-500)',
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-full)',
                          padding: '1px 6px',
                          minWidth: 18,
                          textAlign: 'center'
                        }}>
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Pane: Active Message Thread ────────────────── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-app)'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-default)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                background: selectedConv.color,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}>
                {selectedConv.avatar}
              </div>

              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                  {selectedConv.name}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {selectedConv.isOnline ? (
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                      ● Active now
                    </span>
                  ) : (
                    <span>Last active recently</span>
                  )}
                  <span>•</span>
                  <span>{selectedConv.role}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => toast.success('Starting high-definition campus audio call...')}
                title="Voice Call"
              >
                <Phone size={16} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => toast.success('Starting video collaboration session...')}
                title="Video Call"
              >
                <Video size={16} />
              </button>
            </div>
          </div>

          {/* Message Stream */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {selectedConv.messages.map((msg) => {
              const isMe = msg.sender === 'me';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    alignSelf: isMe ? 'flex-end' : 'flex-start'
                  }}
                >
                  {!isMe && msg.senderName && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2, paddingLeft: 4 }}>
                      {msg.senderName}
                    </span>
                  )}

                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-lg)',
                    borderBottomRightRadius: isMe ? 2 : 'var(--radius-lg)',
                    borderBottomLeftRadius: !isMe ? 2 : 'var(--radius-lg)',
                    background: isMe ? 'var(--color-primary-600)' : 'var(--bg-surface)',
                    color: isMe ? '#ffffff' : 'var(--text-primary)',
                    boxShadow: 'var(--shadow-xs)',
                    border: isMe ? 'none' : '1px solid var(--border-default)',
                    fontSize: '0.9rem',
                    lineHeight: 1.45,
                    wordBreak: 'break-word'
                  }}>
                    {msg.text}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, padding: '0 4px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{msg.time}</span>
                    {isMe && <CheckCheck size={13} color="var(--color-primary-500)" />}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Pills */}
          <div style={{ padding: '6px 18px', display: 'flex', gap: 8, overflowX: 'auto', background: 'var(--bg-surface)' }}>
            {[
              "Let's meet at library!",
              "Sent the GitHub repository link",
              "Available this evening at 5 PM",
              "Thanks a lot for the help!"
            ].map((quick) => (
              <button
                key={quick}
                onClick={() => handleQuickSend(quick)}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  background: 'var(--bg-surface-2)',
                  borderRadius: 'var(--radius-full)',
                  whiteSpace: 'nowrap'
                }}
              >
                {quick}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '12px 18px',
              borderTop: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => toast.success('Attachment picker opened')}
              title="Attach File / Code"
            >
              <Paperclip size={18} />
            </button>

            <input
              type="text"
              className="input"
              style={{ flex: 1, height: 42 }}
              placeholder="Type message or paste code snippet... (Press Enter to send)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!inputText.trim()}
              style={{ height: 42, padding: '0 18px' }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
