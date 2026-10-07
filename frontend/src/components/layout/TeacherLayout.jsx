import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, User, LogOut, Bell, BookOpen, Megaphone, Calendar, Sparkles } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useAiStore from '../../store/aiStore';
import ThemeToggle from '../ui/ThemeToggle';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { icon: Home,       label: 'Dashboard',    to: '/teacher' },
  { icon: Calendar,   label: 'Events',       to: '/teacher/events' },
  { icon: Megaphone,  label: 'Announcements',to: '/teacher/announcements' },
  { icon: BookOpen,   label: 'Resources',    to: '/teacher/resources' },
  { icon: User,       label: 'My Profile',   to: '/teacher/profile' },
];

export default function TeacherLayout() {
  const { user, logout }        = useAuthStore();
  const { openChat }            = useAiStore();
  const navigate                = useNavigate();

  const handleLogout = () => { logout(); toast.success('Logged out'); navigate('/login'); };

  const initials = user?.profile?.fullName
    ? user.profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'T';

  return (
    <div className="app-layout">
      <aside className="sidebar teacher-sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo" style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
            <BookOpen size={20} />
          </div>
          <span className="sidebar__brand-name" style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            UniLink
          </span>
        </div>

        <div style={{ padding: '8px 10px 4px', margin: '8px 0 4px' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 6px' }}>
            Teacher Portal
          </span>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/teacher'}
              className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
              style={({ isActive }) => isActive ? { background: 'rgba(14,165,233,.1)', color: '#0ea5e9' } : {}}
            >
              <item.icon size={20} className="sidebar__link-icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>{initials}</div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.profile?.fullName || user?.email?.split('@')[0]}</span>
              <span className="sidebar__user-role">Teacher</span>
            </div>
          </div>
          <button className="sidebar__logout-btn" onClick={handleLogout} title="Log out"><LogOut size={17} /></button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar__left">
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
              Teacher Portal
            </h2>
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
            <button className="topbar__icon-btn"><Bell size={18} /></button>
            <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>{initials}</div>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>

      <style>{`
        .sidebar { width: var(--sidebar-width); height: 100vh; position: fixed; top:0;left:0; background: var(--bg-surface); border-right: 1px solid var(--border-default); display:flex; flex-direction:column; z-index: var(--z-sticky); }
        .sidebar__brand { display:flex; align-items:center; gap:10px; padding:18px 16px; border-bottom:1px solid var(--border-default); height:var(--topbar-height); }
        .sidebar__logo { width:36px;height:36px; border-radius:var(--radius-md); display:flex;align-items:center;justify-content:center; color:#fff; flex-shrink:0; }
        .sidebar__brand-name { font-family:var(--font-display); font-weight:800; font-size:1.2rem; }
        .sidebar__nav { flex:1; padding:12px 10px; overflow-y:auto; display:flex; flex-direction:column; gap:2px; }
        .sidebar__link { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:var(--radius-md); color:var(--text-secondary); font-size:0.875rem; font-weight:500; transition:all var(--transition-fast); }
        .sidebar__link:hover { background:var(--bg-surface-2); color:var(--text-primary); }
        .sidebar__footer { padding:14px 10px; border-top:1px solid var(--border-default); display:flex; align-items:center; gap:8px; }
        .sidebar__user { display:flex; align-items:center; gap:8px; flex:1; min-width:0; }
        .sidebar__user-info { display:flex; flex-direction:column; min-width:0; }
        .sidebar__user-name { font-size:0.8rem; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sidebar__user-role { font-size:0.7rem; color:var(--text-muted); }
        .sidebar__logout-btn { width:32px;height:32px; border:none; background:transparent; border-radius:var(--radius-sm); display:flex;align-items:center;justify-content:center; color:var(--text-muted); transition:all var(--transition-fast); }
        .sidebar__logout-btn:hover { background:#fee2e2; color:var(--color-danger-500); }
        .topbar { position:fixed; top:0; left:var(--sidebar-width); right:0; height:var(--topbar-height); background:var(--bg-surface); border-bottom:1px solid var(--border-default); display:flex; align-items:center; justify-content:space-between; padding:0 var(--space-6); z-index:calc(var(--z-sticky) - 1); }
        .topbar__left { display:flex; align-items:center; gap:var(--space-4); }
        .topbar__right { display:flex; align-items:center; gap:var(--space-2); }
        .topbar__icon-btn { width:36px;height:36px; border:none; background:transparent; border-radius:var(--radius-md); display:flex;align-items:center;justify-content:center; color:var(--text-secondary); transition:all var(--transition-fast); }
        .topbar__icon-btn:hover { background:var(--bg-surface-2); color:var(--text-primary); }
        .page-content { padding:var(--space-8) var(--space-6); max-width:var(--content-max-width); margin:0 auto; }
      `}</style>
    </div>
  );
}
