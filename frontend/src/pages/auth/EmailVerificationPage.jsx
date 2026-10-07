import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MailCheck, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api';

export default function EmailVerificationPage() {
  const [searchParams]        = useSearchParams();
  const [token, setToken]     = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      verifyToken(urlToken);
    }
  }, [searchParams]);

  const verifyToken = async (tok) => {
    setLoading(true);
    try {
      await authApi.verifyEmail({ token: tok });
      setVerified(true);
      toast.success('College email verified successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification link expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!token) return;
    verifyToken(token);
  };

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #090e17 0%, #151a28 50%, #0d121c 100%)', zIndex: 0 }} />

      <div className="auth-card" style={{ position: 'relative', zIndex: 1, maxWidth: 460, textAlign: 'center' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'rgba(16,185,129,0.15)',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <MailCheck size={28} />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: 6 }}>
          College Email Verification
        </h1>

        <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '0.85rem', marginBottom: 24 }}>
          Confirming your institutional email address to ensure verified campus network trust.
        </p>

        {verified ? (
          <div>
            <div style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: 20,
              color: '#34d399',
            }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 8px', color: '#10b981' }} />
              <div style={{ fontWeight: 600 }}>Email Address Verified!</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,.6)', marginTop: 4 }}>
                Your institutional email identity has been confirmed.
              </div>
            </div>

            <Link to="/login/student" className="btn btn-primary btn-full">
              Proceed to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!searchParams.get('token') && (
              <div className="input-group" style={{ textAlign: 'left' }}>
                <label className="input-label">Verification Token</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Paste token from verification email"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !token}
            >
              {loading ? 'Verifying with Server...' : 'Verify Email Address'}
            </button>

            <Link to="/" className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,.5)' }}>
              Return to Campus Home
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
