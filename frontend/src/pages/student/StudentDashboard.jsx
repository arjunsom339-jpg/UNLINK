import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Users, AlertTriangle, MessageSquare, Star,
  TrendingUp, Zap, ArrowRight, Bell, Calendar
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const QUICK_ACTIONS = [
  { icon: BookOpen,      label: 'Learn & Connect', to: '/student/learn',     color: '#6366f1', bg: 'rgba(99,102,241,.1)',   desc: 'Skills, Q&A, Resources' },
  { icon: Users,         label: 'Community',       to: '/student/community', color: '#10b981', bg: 'rgba(16,185,129,.1)',   desc: 'Feed, Polls, Events' },
  { icon: AlertTriangle, label: 'Help & Emergency', to: '/student/help',    color: '#ef4444', bg: 'rgba(239,68,68,.1)',    desc: 'Request & nearby help' },
  { icon: MessageSquare, label: 'Messages',         to: '/student/messages', color: '#f59e0b', bg: 'rgba(245,158,11,.1)',  desc: 'DMs and group chats' },
];

const MOCK_ANNOUNCEMENTS = [
  { id: 1, title: 'Mid-semester exams schedule released', time: '2 hours ago', type: 'academic', pinned: true },
  { id: 2, title: 'Hackathon registrations open — Form teams now!', time: '5 hours ago', type: 'event', pinned: false },
  { id: 3, title: 'Library holiday hours for Diwali', time: '1 day ago', type: 'general', pinned: false },
];

const MOCK_SKILL_MATCHES = [
  { id: 1, name: 'Arjun Kumar',    knows: 'React',  wants: 'Python',   dept: 'CSE', sem: 5, match: 95 },
  { id: 2, name: 'Priya Sharma',   knows: 'Python', wants: 'UI/UX',    dept: 'ISE', sem: 4, match: 88 },
  { id: 3, name: 'Rahul Verma',    knows: 'Java',   wants: 'React',    dept: 'CSE', sem: 6, match: 82 },
];

export default function StudentDashboard() {
  const user    = useAuthStore((s) => s.user);
  const profile = user?.profile;
  const name    = profile?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Student';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* ── Hero Greeting ─────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #0ea5e9 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        position: 'relative',
        overflow: 'hidden',
        color: '#fff',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'rgba(255,255,255,.07)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 60, width: 150, height: 150, background: 'rgba(255,255,255,.05)', borderRadius: '50%' }} />
        <p style={{ fontSize: '0.875rem', opacity: 0.75, marginBottom: 4 }}>{getGreeting()},</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>
          {name} 👋
        </h1>
        <p style={{ opacity: 0.7, fontSize: '0.9rem', maxWidth: 420 }}>
          Welcome to your UniLink campus hub. Learn, connect, collaborate, and grow.
        </p>
        {profile && (
          <div style={{ display: 'flex', gap: 16, marginTop: 18, flexWrap: 'wrap' }}>
            {profile.usn && (
              <span style={{ background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 500 }}>
                📋 {profile.usn}
              </span>
            )}
            {profile.department && (
              <span style={{ background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 500 }}>
                🏫 {profile.department}
              </span>
            )}
            {profile.semester && (
              <span style={{ background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 500 }}>
                📅 Semester {profile.semester}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Quick Stats ────────────────────────────────────────── */}
      <div className="grid-4">
        {[
          { label: 'Reputation', value: profile?.reputationScore ?? 0, icon: Star, color: '#f59e0b', bg: 'rgba(245,158,11,.1)' },
          { label: 'Connections', value: profile?.connectionsCount ?? 0, icon: Users, color: '#6366f1', bg: 'rgba(99,102,241,.1)' },
          { label: 'Skills Known', value: profile?.skillsKnown?.length ?? 0, icon: Zap, color: '#10b981', bg: 'rgba(16,185,129,.1)' },
          { label: 'Helpful Answers', value: profile?.helpfulAnswersCount ?? 0, icon: TrendingUp, color: '#0ea5e9', bg: 'rgba(14,165,233,.1)' },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-card-icon" style={{ background: stat.bg }}>
              <stat.icon size={20} color={stat.color} />
            </div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main Grid ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Quick Actions</h2>
            </div>
            <div className="grid-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-surface-2)',
                    transition: 'all var(--transition-fast)',
                    textDecoration: 'none',
                  }}
                  className="quick-action-link"
                >
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: action.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <action.icon size={20} color={action.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 2 }}>{action.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{action.desc}</div>
                  </div>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Skill Match Suggestions */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">✨ Skill Exchange Matches</h2>
              <Link to="/student/learn" style={{ fontSize: '0.8rem', color: 'var(--color-primary-500)' }}>
                View all →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {MOCK_SKILL_MATCHES.map((match) => (
                <div key={match.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface-2)' }}>
                  <div className="avatar avatar-md">{match.name[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{match.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {match.dept} · Sem {match.sem}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Knows: {match.knows}</span>
                      <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>Wants: {match.wants}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>{match.match}%</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>match</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — Announcements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={17} /> Announcements
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {MOCK_ANNOUNCEMENTS.map((ann) => (
                <div key={ann.id} style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: ann.pinned ? 'rgba(99,102,241,.04)' : 'var(--bg-surface-2)', borderLeft: ann.pinned ? '3px solid var(--color-primary-500)' : '1px solid var(--border-default)' }}>
                  {ann.pinned && <span className="badge badge-primary" style={{ marginBottom: 6, fontSize: '0.65rem' }}>📌 Pinned</span>}
                  <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{ann.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 5 }}>{ann.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={17} /> Upcoming Events
              </h2>
            </div>
            <div className="empty-state" style={{ padding: '20px 16px' }}>
              <Calendar size={32} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>No upcoming events</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .quick-action-link:hover { border-color: var(--color-primary-400) !important; background: var(--color-primary-50) !important; transform: translateY(-1px); box-shadow: var(--shadow-md); }
        [data-theme="dark"] .quick-action-link:hover { background: rgba(99,102,241,.08) !important; }
        @media (max-width: 1024px) { div[style*="grid-template-columns: 1fr 340px"] { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
