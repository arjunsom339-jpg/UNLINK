import { useNavigate } from 'react-router-dom';
import { AlertOctagon, LogOut, Mail, Phone } from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function SuspendedPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #180a0a 0%, #291010 50%, #0d0606 100%)', zIndex: 0 }} />

      <div className="auth-card" style={{ position: 'relative', zIndex: 1, maxWidth: 480, textAlign: 'center', borderColor: 'rgba(239,68,68,0.25)' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: 'rgba(239,68,68,0.15)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          border: '1.5px solid rgba(239,68,68,0.3)',
        }}>
          <AlertOctagon size={32} />
        </div>

        <span className="badge badge-danger" style={{ marginBottom: 12, fontSize: '0.8rem', padding: '4px 12px' }}>
          ACCOUNT SUSPENDED
        </span>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>
          Access Temporarily Restricted
        </h1>

        <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '0.9rem', lineHeight: 1.55, marginBottom: 24 }}>
          Your UniLink account ({user?.email}) has been placed on administrative hold by college moderation. All campus messaging and portal access have been temporarily suspended.
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          textAlign: 'left',
          marginBottom: 24,
          fontSize: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: 2 }}>Campus Support & Grievance Desk:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,.7)' }}>
            <Mail size={14} color="#ef4444" />
            <span>admin@unilink.edu</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,.7)' }}>
            <Phone size={14} color="#ef4444" />
            <span>+91 80-2841-0000 (Dean of Student Affairs)</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-full"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <LogOut size={15} /> Return to Campus Home
        </button>
      </div>
    </div>
  );
}
