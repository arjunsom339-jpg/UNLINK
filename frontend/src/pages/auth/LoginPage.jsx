import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { GraduationCap, BookOpen, Shield, Mail, ArrowLeft, AlertTriangle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { authApi } from '../../api';
import useAuthStore from '../../store/authStore';

import AuthBackground from '../../components/auth/AuthBackground';
import AuthBrand from '../../components/auth/AuthBrand';
import RoleSelector from '../../components/auth/RoleSelector';
import AuthInput from '../../components/auth/AuthInput';
import PasswordInput from '../../components/auth/PasswordInput';
import AuthCheckbox from '../../components/auth/AuthCheckbox';
import AuthButton from '../../components/auth/AuthButton';
import SystemStatusBar from '../../components/auth/SystemStatusBar';

import '../../components/auth/auth.css';

export default function LoginPage({ initialRole }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  // Determine active role from prop, query param (?role=...), or default to 'student'
  const determineInitialRole = () => {
    if (initialRole) return initialRole;
    const queryRole = searchParams.get('role');
    if (queryRole === 'teacher' || queryRole === 'core') return 'teacher';
    if (queryRole === 'admin') return 'admin';
    return 'student';
  };

  const [selectedRole, setSelectedRole] = useState(determineInitialRole);
  const [form, setForm] = useState({
    email: localStorage.getItem('unilink_saved_email') || '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(
    Boolean(localStorage.getItem('unilink_remember_active'))
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Update query param when role is changed manually
  const handleRoleSelect = (newRole) => {
    setSelectedRole(newRole);
    setErrors({});
    setAuthError(null);
    setAuthSuccess(null);
    setSearchParams({ role: newRole === 'teacher' ? 'core' : newRole }, { replace: true });
  };

  // Subtle pointer parallax listener for desktop (disabled on touch devices)
  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || prefersReduced) return;

    let rafId;
    const handleMouseMove = (e) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const normX = (e.clientX / window.innerWidth - 0.5) * 2;
        const normY = (e.clientY / window.innerHeight - 0.5) * 2;
        setMousePos({ x: normX, y: normY });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setAuthError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const validationErrors = {};
    if (!form.email?.trim()) {
      validationErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      validationErrors.email = 'Please enter a valid email address';
    }
    if (!form.password) {
      validationErrors.password = 'Password is required';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      let response;
      if (selectedRole === 'student') {
        response = await authApi.loginStudent(form);
      } else if (selectedRole === 'teacher') {
        response = await authApi.loginTeacher(form);
      } else if (selectedRole === 'admin') {
        response = await authApi.loginAdmin(form);
      } else {
        response = await authApi.login(form);
      }

      const authData = response.data.data;
      setAuth(authData);

      // Handle remember session storage
      if (rememberMe) {
        localStorage.setItem('unilink_saved_email', form.email);
        localStorage.setItem('unilink_remember_active', 'true');
      } else {
        localStorage.removeItem('unilink_saved_email');
        localStorage.removeItem('unilink_remember_active');
      }

      const userName = authData.user.profile?.fullName || authData.user.email?.split('@')[0] || 'User';
      setAuthSuccess(`Access Granted. Welcome, ${userName}.`);
      toast.success(`Welcome back, ${userName}!`);

      // Determine redirect path
      const role = authData.user.role;
      let targetPath = location.state?.from?.pathname;
      if (!targetPath) {
        if (role === 'admin') targetPath = '/admin';
        else if (role === 'teacher') targetPath = '/teacher';
        else targetPath = '/student';
      }

      // Smooth brief transition
      setTimeout(() => {
        navigate(targetPath);
      }, 350);
    } catch (err) {
      const resp = err.response?.data;

      // Handle account verification / restriction workflows
      if (resp?.code === 'ACCOUNT_PENDING_VERIFICATION' || resp?.data?.isPendingVerification) {
        toast.error('Account pending institutional verification.');
        navigate('/pending-verification');
        return;
      }
      if (resp?.code === 'ACCOUNT_SUSPENDED') {
        navigate('/suspended');
        return;
      }
      if (resp?.code === 'ACCOUNT_BANNED') {
        navigate('/banned');
        return;
      }

      const failureMessage = resp?.message || 'Invalid email or password. Access attempt denied.';
      setAuthError({
        title: 'ACCESS DENIED',
        message: failureMessage,
      });
      toast.error(failureMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const { data } = await authApi.firebaseLogin({ idToken: 'test-firebase-token', role: 'student' });
      setAuth(data.data);
      const userName = data.data.user.profile?.fullName || 'Student';
      setAuthSuccess(`Access Granted. Welcome, ${userName}.`);
      toast.success('Campus SSO authentication successful!');
      setTimeout(() => {
        navigate(location.state?.from?.pathname || '/student');
      }, 350);
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.code === 'ACCOUNT_PENDING_VERIFICATION' || resp?.data?.isPendingVerification) {
        navigate('/pending-verification');
        return;
      }
      const failureMessage = resp?.message || 'Google SSO authentication failed.';
      setAuthError({ title: 'ACCESS DENIED', message: failureMessage });
      toast.error(failureMessage);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic configuration based on selected role
  const roleConfig = {
    student: {
      heading: 'Authenticate Student',
      subtext: 'Secure access to the UniLink campus network.',
      emailLabel: 'COLLEGE EMAIL ADDRESS',
      emailPlaceholder: 'student.usn@college.edu',
      emailIcon: Mail,
      btnLabel: 'AUTHENTICATE STUDENT',
      secondaryAction: {
        text: 'Request Access',
        to: '/register/student',
      },
    },
    teacher: {
      heading: 'Authenticate Core',
      subtext: 'Faculty coordination & institutional command channel.',
      emailLabel: 'FACULTY / CORE EMAIL',
      emailPlaceholder: 'faculty@college.edu',
      emailIcon: BookOpen,
      btnLabel: 'AUTHENTICATE CORE',
      secondaryAction: {
        text: 'Request Core Access',
        to: '/register/teacher',
      },
    },
    admin: {
      heading: 'Authenticate Admin',
      subtext: 'Restricted administrative enclave. Audit logging active.',
      emailLabel: 'ADMINISTRATOR EMAIL',
      emailPlaceholder: 'admin@unilink.edu',
      emailIcon: Shield,
      btnLabel: 'AUTHENTICATE ADMIN',
      secondaryAction: null,
    },
  }[selectedRole] || {};

  return (
    <div className="auth-gateway-root">
      {/* Dynamic Background with particles & ambient glow */}
      <AuthBackground mousePos={mousePos} />

      <main className="auth-content-wrapper">
        {/* Top Brand Treatment */}
        <AuthBrand />

        {/* Central Futuristic Authentication Card */}
        <div className="auth-glass-card" id={`auth-panel-${selectedRole}`} role="tabpanel">
          {/* Back to Hub navigation */}
          <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--auth-text-muted)',
                fontSize: '0.8rem',
                textDecoration: 'none',
                transition: 'color 150ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--auth-text-muted)')}
            >
              <ArrowLeft size={14} /> Back to Campus Hub
            </Link>

            {selectedRole === 'admin' && (
              <span className="auth-restricted-badge">
                <ShieldCheck size={13} />
                Restricted Enclave
              </span>
            )}
          </div>

          {/* Segmented Glass Role Selector */}
          <RoleSelector selectedRole={selectedRole} onSelectRole={handleRoleSelect} />

          {/* Dynamic Header & Secondary Action */}
          <div className="auth-header-row">
            <div className="auth-heading-wrap">
              <h1 className="auth-primary-heading">{roleConfig.heading}</h1>
              <p className="auth-secondary-desc">{roleConfig.subtext}</p>
            </div>

            {roleConfig.secondaryAction && (
              <Link to={roleConfig.secondaryAction.to} className="auth-secondary-action-link">
                {roleConfig.secondaryAction.text}
              </Link>
            )}
          </div>

          {/* Inline Feedback Alerts */}
          {authError && (
            <div className="auth-alert-box auth-alert-error" role="alert" aria-live="polite">
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>{authError.title}</strong>
                <span>{authError.message}</span>
              </div>
            </div>
          )}

          {authSuccess && (
            <div className="auth-alert-box auth-alert-success" role="status" aria-live="polite">
              <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>ACCESS GRANTED</strong>
                <span>{authSuccess}</span>
              </div>
            </div>
          )}

          {/* Authentication Form */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <AuthInput
              id="auth-email"
              name="email"
              label={roleConfig.emailLabel}
              type="email"
              placeholder={roleConfig.emailPlaceholder}
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              icon={roleConfig.emailIcon}
              autoComplete="email"
              required
              disabled={loading}
            />

            <PasswordInput
              id="auth-password"
              name="password"
              label="SECURITY PASSWORD"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              showForgot={selectedRole !== 'admin'}
              disabled={loading}
            />

            {/* Remember Session & Secondary Links */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
              <AuthCheckbox
                id="auth-remember-session"
                checked={rememberMe}
                onChange={setRememberMe}
                label="Remember session"
                disabled={loading}
              />
            </div>

            {/* Primary Action Button */}
            <AuthButton
              type="submit"
              loading={loading}
              label={roleConfig.btnLabel}
              loadingLabel="AUTHENTICATING"
            />

            {/* Google Campus SSO option for students */}
            {selectedRole === 'student' && (
              <>
                <div className="auth-divider-row" aria-hidden="true">
                  <span className="auth-divider-line" />
                  <span>or connect via</span>
                  <span className="auth-divider-line" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="auth-sso-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Google Campus SSO</span>
                </button>
              </>
            )}
          </form>
        </div>

        {/* Technical Footer Status Bar */}
        <SystemStatusBar />
      </main>
    </div>
  );
}
