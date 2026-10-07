import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api';

export default function ResetPassword() {
  const [searchParams]          = useSearchParams();
  const [token, setToken]       = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const navigate                = useNavigate();

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) setToken(urlToken);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Reset token is required');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      toast.success('Password updated successfully! Please log in.');
      navigate('/login/student');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed. Token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #090e17 0%, #151a28 50%, #0d121c 100%)', zIndex: 0 }} />

      <div className="auth-card" style={{ position: 'relative', zIndex: 1, maxWidth: 460 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,.5)', fontSize: '0.82rem', marginBottom: 20, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to Campus Hub
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{
            width: 52,
            height: 52,
            background: 'linear-gradient(135deg, #10b981, #6366f1)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 8px 24px rgba(16,185,129,.3)',
          }}>
            <Lock size={26} color="#fff" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            Set New Password
          </h1>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '0.85rem' }}>
            Choose a strong password with at least 8 characters
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!searchParams.get('token') && (
            <div className="input-group">
              <label className="input-label">Reset Token</label>
              <input
                type="text"
                className="input"
                placeholder="Paste token received in email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                className="input"
                style={{ paddingRight: 40 }}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', padding: 0 }}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Confirm New Password</label>
            <input
              type={showPwd ? 'text' : 'password'}
              className="input"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: 6 }}
          >
            {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
