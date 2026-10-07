import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldX, ArrowRight, Home } from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function UnauthorizedPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const currentRole = user?.role || 'Guest';

  const handleGoHome = () => {
    if (user?.role === 'student') navigate('/student');
    else if (user?.role === 'teacher') navigate('/teacher');
    else if (user?.role === 'admin') navigate('/admin');
    else navigate('/');
  };

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #090e17 0%, #171529 50%, #0d121c 100%)', zIndex: 0 }} />

      <div className="auth-card" style={{ position: 'relative', zIndex: 1, maxWidth: 480, textAlign: 'center' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: 'rgba(239,68,68,0.12)',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          border: '1.5px solid rgba(239,68,68,0.25)',
        }}>
          <ShieldX size={34} />
        </div>

        <span className="badge badge-danger" style={{ marginBottom: 12, fontSize: '0.8rem', padding: '4px 12px' }}>
          403 ACCESS FORBIDDEN
        </span>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>
          Role Authorization Restriction
        </h1>

        <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '0.9rem', lineHeight: 1.55, marginBottom: 24 }}>
          You are currently signed in as a <strong style={{ color: 'var(--color-primary-400)', textTransform: 'capitalize' }}>{currentRole}</strong>.
          You do not have permissions to access this portal or API resource.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleGoHome}
            className="btn btn-primary btn-full"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Home size={16} /> Return to My {currentRole.toUpperCase()} Portal <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
