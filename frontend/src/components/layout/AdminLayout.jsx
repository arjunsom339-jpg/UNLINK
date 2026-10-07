import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Bell, Shield, Moon, Sun, Calendar, BookOpen, Award, Briefcase, Compass, ShoppingBag } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/admin' },
  { icon: Users,           label: 'Users',     to: '/admin/users' },
  { icon: Briefcase,       label: 'Placements (TPC)', to: '/admin/placements' },
  { icon: Compass,         label: 'Clubs',     to: '/admin/clubs' },
  { icon: Award,           label: 'Alumni & Mentors', to: '/admin/alumni' },
  { icon: Calendar,        label: 'Events',    to: '/admin/events' },
  { icon: BookOpen,        label: 'Resources', to: '/admin/resources' },
  { icon: ShoppingBag,     label: 'Campus Exchange', to: '/admin/campus-exchange' },
];

export default function AdminLayout() {
  const [darkMode, setDarkMode] = useState(false);
  const { user, logout }        = useAuthStore();
  const navigate                = useNavigate();

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };

  const handleLogout = () => { logout(); toast.success('Logged out'); navigate('/login'); };

  return (
    <div className="app-layout">
      <aside style={{ width: 'var(--sidebar-width)', height: '100vh', position: 'fixed', top: 0, left: 0, background: '#0f172a', display: 'flex', flexDirection: 'column', zIndex: 'var(--z-sticky)', borderRight: '1px solid rgba(255,255,255,.06)' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,.06)', height: 'var(--topbar-height)' }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Shield size={20} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Admin Panel
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) => isActive ? 'admin-nav-link active' : 'admin-nav-link'}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 10px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
            {(user?.email?.[0] || 'A').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email?.split('@')[0]}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,.4)' }}>Administrator</div>
          </div>
          <button onClick={handleLogout} title="Log out" style={{ width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.4)', cursor: 'pointer' }}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header style={{ position: 'fixed', top: 0, left: 'var(--sidebar-width)', right: 0, height: 'var(--topbar-height)', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-6)', zIndex: 199 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>UniLink Admin</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleDark} style={{ width: 36, height: 36, border: 'none', background: 'transparent', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>

      <style>{`
        .admin-nav-link { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:8px; color:rgba(255,255,255,.5); font-size:0.875rem; font-weight:500; transition:all 150ms ease; text-decoration:none; }
        .admin-nav-link:hover { background:rgba(255,255,255,.06); color:rgba(255,255,255,.9); }
        .admin-nav-link.active { background:rgba(245,158,11,.12); color:#f59e0b; }
        .page-content { padding:var(--space-8) var(--space-6); max-width:var(--content-max-width); margin:0 auto; }
      `}</style>
    </div>
  );
}
