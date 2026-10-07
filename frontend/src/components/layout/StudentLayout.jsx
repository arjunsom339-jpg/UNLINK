import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Home, BookOpen, Users, AlertTriangle, MessageSquare, User,
  ChevronRight, ChevronLeft, LogOut, Bell, Search, Sparkles,
  GraduationCap, Calendar, FolderOpen, Award, Briefcase, Compass, ShoppingBag, ShieldAlert
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useAiStore from '../../store/aiStore';
import ThemeToggle from '../ui/ThemeToggle';
import toast from 'react-hot-toast';

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { icon: Home,          label: 'Home',            to: '/student' },
    ],
  },
  {
    label: 'CORE',
    items: [
      { icon: BookOpen,      label: 'Learn & Connect', to: '/student/learn' },
      { icon: Users,         label: 'Community',       to: '/student/community' },
      { icon: AlertTriangle, label: 'Help & Emergency', to: '/student/help', badge: 'SOS', special: true },
      { icon: MessageSquare, label: 'Messages',        to: '/student/messages' },
    ],
  },
  {
    label: 'CAMPUS & CAREERS',
    items: [
      { icon: Briefcase,     label: 'Placements (TPC)', to: '/student/placements' },
      { icon: Award,         label: 'Alumni & Mentors', to: '/student/mentorship' },
      { icon: FolderOpen,    label: 'Resource Vault',  to: '/student/resources' },
      { icon: Calendar,      label: 'Events',          to: '/student/events' },
      { icon: Compass,       label: 'Clubs & Societies', to: '/student/clubs' },
      { icon: ShoppingBag,   label: 'Campus Exchange', to: '/student/campus-exchange' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { icon: User,          label: 'My Profile',      to: '/student/profile' },
    ],
  },
];

export default function StudentLayout() {
  const [collapsed, setCollapsed]   = useState(false);
  const { user, logout }            = useAuthStore();
  const { openChat }                = useAiStore();
  const navigate                    = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const initials = user?.profile?.fullName
    ? user.profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="app-layout">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <GraduationCap size={22} />
          </div>
          {!collapsed && (
            <span className="sidebar__brand-name">UniLink</span>
          )}
          <button
            className="sidebar__collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si} className="sidebar__section">
              {section.label && !collapsed && (
                <span className="sidebar__section-label">{section.label}</span>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/student'}
                  className={({ isActive }) =>
                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''} ${item.special ? 'sidebar__link--emergency' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={20} className="sidebar__link-icon" />
                  {!collapsed && <span>{item.label}</span>}
                  {item.badge && !collapsed && (
                    <span className="sidebar__badge">{item.badge}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="avatar avatar-sm sidebar__user-avatar">
              {initials}
            </div>
            {!collapsed && (
              <div className="sidebar__user-info">
                <span className="sidebar__user-name">
                  {user?.profile?.fullName || user?.email?.split('@')[0]}
                </span>
                <span className="sidebar__user-role">Student</span>
              </div>
            )}
          </div>
          <button
            className="sidebar__logout-btn"
            onClick={handleLogout}
            title="Log out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {/* ── Main Area ────────────────────────────────────────── */}
      <div className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar__left">
            <div className="topbar__search">
              <Search size={16} className="topbar__search-icon" />
              <input
                className="topbar__search-input"
                placeholder="Search students, resources, questions…"
              />
            </div>
          </div>
          <div className="topbar__right">
            <button
              onClick={openChat}
              title="Ask Campus AI"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 13px',
                borderRadius: 9999,
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.25)',
                color: '#818cf8',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.22)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.12)';
                e.currentTarget.style.color = '#818cf8';
              }}
            >
              <Sparkles size={14} />
              <span>Ask Campus AI</span>
            </button>
            <ThemeToggle />
            <button className="topbar__icon-btn topbar__notify-btn" title="Notifications">
              <Bell size={18} />
              <span className="topbar__notify-dot" />
            </button>
            <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #10b981)' }}>
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      <style>{`
        /* ── Sidebar ─────────────────────────────────────────── */
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          position: fixed;
          top: 0; left: 0;
          background: var(--bg-surface);
          border-right: 1px solid var(--border-default);
          display: flex;
          flex-direction: column;
          transition: width var(--transition-normal);
          z-index: var(--z-sticky);
          overflow: hidden;
        }

        .sidebar--collapsed { width: 72px; }

        .sidebar__brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 16px;
          border-bottom: 1px solid var(--border-default);
          height: var(--topbar-height);
          flex-shrink: 0;
        }

        .sidebar__logo {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, var(--color-primary-600), var(--color-accent-500));
          border-radius: var(--radius-md);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }

        .sidebar__brand-name {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 1.2rem;
          background: linear-gradient(135deg, var(--color-primary-600), var(--color-accent-500));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          white-space: nowrap;
          flex: 1;
        }

        .sidebar__collapse-btn {
          width: 24px; height: 24px;
          border: none;
          background: var(--bg-surface-2);
          border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .sidebar__collapse-btn:hover {
          background: var(--color-primary-100);
          color: var(--color-primary-600);
        }

        [data-theme="dark"] .sidebar__collapse-btn:hover {
          background: rgba(99,102,241,.15);
        }

        .sidebar__nav {
          flex: 1;
          padding: 12px 10px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sidebar__section { margin-bottom: 8px; }

        .sidebar__section-label {
          display: block;
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          text-transform: uppercase;
          padding: 8px 10px 4px;
        }

        .sidebar__link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          transition: all var(--transition-fast);
          white-space: nowrap;
          position: relative;
        }

        .sidebar__link:hover {
          background: var(--bg-surface-2);
          color: var(--text-primary);
        }

        .sidebar__link--active {
          background: var(--color-primary-50);
          color: var(--color-primary-700);
          font-weight: 600;
        }

        [data-theme="dark"] .sidebar__link--active {
          background: rgba(99,102,241,.12);
          color: var(--color-primary-400);
        }

        .sidebar__link--emergency {
          color: #dc2626;
        }

        .sidebar__link--emergency:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #ef4444;
        }

        .sidebar__link--emergency.sidebar__link--active {
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
          font-weight: 700;
        }

        .sidebar__link-icon { flex-shrink: 0; }

        .sidebar__badge {
          margin-left: auto;
          background: var(--color-danger-500);
          color: #fff;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: var(--radius-full);
          min-width: 18px;
          text-align: center;
        }

        .sidebar__footer {
          padding: 14px 10px;
          border-top: 1px solid var(--border-default);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .sidebar__user {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }

        .sidebar__user-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        .sidebar__user-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar__user-role {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .sidebar__logout-btn {
          width: 32px; height: 32px;
          border: none;
          background: transparent;
          border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted);
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .sidebar__logout-btn:hover {
          background: #fee2e2;
          color: var(--color-danger-500);
        }

        /* ── Topbar ──────────────────────────────────────────── */
        .topbar {
          position: fixed;
          top: 0;
          left: var(--sidebar-width);
          right: 0;
          height: var(--topbar-height);
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-default);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-6);
          z-index: calc(var(--z-sticky) - 1);
          transition: left var(--transition-normal);
          backdrop-filter: blur(12px);
        }

        .sidebar--collapsed ~ .main-content .topbar {
          left: 72px;
        }

        .topbar__left { display: flex; align-items: center; gap: var(--space-4); flex: 1; }

        .topbar__search {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          background: var(--bg-surface-2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-full);
          padding: 7px 14px;
          max-width: 380px;
          width: 100%;
          transition: all var(--transition-fast);
        }

        .topbar__search:focus-within {
          border-color: var(--color-primary-400);
          box-shadow: 0 0 0 3px rgba(99,102,241,.1);
        }

        .topbar__search-icon { color: var(--text-muted); flex-shrink: 0; }

        .topbar__search-input {
          border: none;
          outline: none;
          background: transparent;
          color: var(--text-primary);
          font-size: 0.875rem;
          width: 100%;
        }

        .topbar__search-input::placeholder { color: var(--text-muted); }

        .topbar__right {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-shrink: 0;
        }

        .topbar__icon-btn {
          width: 36px; height: 36px;
          border: none;
          background: transparent;
          border-radius: var(--radius-md);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
          position: relative;
        }

        .topbar__icon-btn:hover {
          background: var(--bg-surface-2);
          color: var(--text-primary);
        }

        .topbar__notify-dot {
          position: absolute;
          top: 7px; right: 7px;
          width: 8px; height: 8px;
          background: var(--color-danger-500);
          border-radius: 50%;
          border: 2px solid var(--bg-surface);
        }

        /* ── Page Content ─────────────────────────────────── */
        .page-content {
          padding: var(--space-8) var(--space-6);
          max-width: var(--content-max-width);
          margin: 0 auto;
        }

        /* ── Responsive ──────────────────────────────────── */
        @media (max-width: 1024px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .topbar { left: 0 !important; }
          .main-content { margin-left: 0 !important; padding-top: var(--topbar-height); }
          .topbar__search { max-width: 220px; }
        }
      `}</style>
    </div>
  );
}
