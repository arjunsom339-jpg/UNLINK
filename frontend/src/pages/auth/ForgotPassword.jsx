import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api';
import AuthBackground from '../../components/auth/AuthBackground';
import '../../components/auth/auth.css';

export default function ForgotPassword() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState(null);
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your college email');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.forgotPassword({ email });
      setSubmitted(true);
      if (data.data?.resetToken) {
        setDevToken(data.data.resetToken);
      }
      toast.success(data.message || 'Password reset instructions dispatched.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthBackground />

      <div className="auth-card" style={{ position: 'relative', zIndex: 1, maxWidth: 460 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,.5)', fontSize: '0.82rem', marginBottom: 20, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to Campus Hub
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{
            width: 52,
            height: 52,
            background: 'rgba(255, 255, 255, 0.18)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 0 24px rgba(255,255,255,0.12), inset 0 1px 1px rgba(255,255,255,0.3)',
          }}>
            <KeyRound size={26} color="#fff" />
          </div>
          <h1 style={{ fontFamily: "'Urbanist', system-ui, sans-serif", fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: 4, textShadow: '0 1px 12px oklch(0 0 0 / 0.25)' }}>
            Reset Password
          </h1>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '0.85rem' }}>
            Enter your college email address to receive password reset instructions
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              marginBottom: 20,
              fontSize: '0.9rem',
              color: '#34d399',
              lineHeight: 1.5,
            }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 10px', color: '#10b981' }} />
              If an account is associated with <strong>{email}</strong>, password reset instructions have been generated.
            </div>

            {devToken && (
              <div style={{ marginBottom: 20 }}>
                <Link
                  to={`/reset-password?token=${devToken}`}
                  className="btn btn-primary btn-full"
                  style={{ textDecoration: 'none' }}
                >
                  Continue to Set New Password
                </Link>
              </div>
            )}

            <Link to="/login/student" className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,.7)' }}>
              Return to Student Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="email">Registered Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.35)', pointerEvents: 'none' }} />
                <input
                  id="email"
                  type="email"
                  className="input"
                  style={{ paddingLeft: 38 }}
                  placeholder="your.email@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ marginTop: 6 }}
            >
              {loading ? 'Dispatching Instructions...' : 'Send Reset Instructions'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
