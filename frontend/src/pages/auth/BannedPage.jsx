import { useNavigate } from 'react-router-dom';
import { Ban, LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function BannedPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1f0505 0%, #120303 100%)', zIndex: 0 }} />

      <div className="auth-card" style={{ position: 'relative', zIndex: 1, maxWidth: 460, textAlign: 'center', borderColor: 'rgba(220,38,38,0.4)' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: 'rgba(220,38,38,0.2)',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          border: '1.5px solid rgba(220,38,38,0.4)',
        }}>
          <Ban size={34} />
        </div>

        <span className="badge badge-danger" style={{ marginBottom: 12, fontSize: '0.8rem', padding: '4px 12px', background: '#7f1d1d', color: '#fecaca' }}>
          PERMANENTLY BANNED
        </span>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>
          Account Access Terminated
        </h1>

        <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '0.9rem', lineHeight: 1.55, marginBottom: 28 }}>
          This UniLink account ({user?.email}) has been permanently banned from the campus network due to severe or repeated violations of the institutional code of conduct and cyber policy.
        </p>

        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-full"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <LogOut size={15} /> Exit Session
        </button>
      </div>
    </div>
  );
}
