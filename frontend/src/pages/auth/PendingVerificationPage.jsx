import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ShieldAlert, CheckCircle, RefreshCw, LogOut, ArrowRight, Building, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { authApi } from '../../api';

export default function PendingVerificationPage() {
  const { user, logout, updateUser } = useAuthStore();
  const [checking, setChecking]       = useState(false);
  const navigate                      = useNavigate();

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const { data } = await authApi.getMe();
      const updatedUser = data.data;
      updateUser(updatedUser);

      if (updatedUser.accountStatus === 'active' && (updatedUser.isAdminVerified || updatedUser.role === 'admin')) {
        toast.success('Your account has been verified! Welcome to UniLink.');
        if (updatedUser.role === 'student') navigate('/student');
        else if (updatedUser.role === 'teacher') navigate('/teacher');
        else if (updatedUser.role === 'admin') navigate('/admin');
        return;
      }

      toast('Your account is still pending administrative review. Please check back shortly.', { icon: '⏳' });
    } catch {
      toast.error('Unable to fetch account status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isTeacher = user?.role === 'teacher';
  const profile = user?.profile || user?.studentProfile || user?.teacherProfile || {};

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0b1320 0%, #151d2c 50%, #0d1624 100%)', zIndex: 0 }} />

      <div className="auth-card" style={{ position: 'relative', zIndex: 1, maxWidth: 520, textAlign: 'center' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: 'rgba(245,158,11,0.15)',
          color: '#f59e0b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          border: '1.5px solid rgba(245,158,11,0.3)',
        }}>
          <Clock size={32} />
        </div>

        <span className="badge badge-warning" style={{ marginBottom: 12, fontSize: '0.8rem', padding: '4px 12px' }}>
          PENDING INSTITUTIONAL VERIFICATION
        </span>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>
          Verification Under Review
        </h1>

        <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '0.9rem', lineHeight: 1.55, marginBottom: 24 }}>
          {isTeacher
            ? 'Your faculty profile and institutional Teacher ID have been submitted for college administrative approval.'
            : 'Your student account and University Seat Number (USN) have been submitted to your college administration desk for identity verification.'}
        </p>

        {/* Submitted Credentials Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          textAlign: 'left',
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          fontSize: '0.85rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,.5)' }}>
            <span>Applicant Role:</span>
            <span style={{ color: '#fff', fontWeight: 600, textTransform: 'capitalize' }}>{user?.role || 'Student'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,.5)' }}>
            <span>Email Address:</span>
            <span style={{ color: '#fff', fontWeight: 500 }}>{user?.email}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,.5)' }}>
            <span>{isTeacher ? 'Teacher ID:' : 'Seat Number (USN):'}</span>
            <span style={{ color: 'var(--color-primary-400)', fontWeight: 700 }}>
              {profile.usn || profile.teacherId || 'Under Record'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,.5)' }}>
            <span>College Campus:</span>
            <span style={{ color: '#fff' }}>{profile.college || 'National Institute of Engineering'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="btn btn-primary btn-full"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <RefreshCw size={16} className={checking ? 'spinner' : ''} />
            {checking ? 'Checking with Server...' : 'Check Verification Status'}
          </button>

          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-full"
            style={{ color: 'rgba(255,255,255,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
