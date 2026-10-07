import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, User, Hash, Building, Phone, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api';
import useAuthStore from '../../store/authStore';
import AuthBackground from '../../components/auth/AuthBackground';
import '../../components/auth/auth.css';

export default function StudentRegister() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    usn: '',
    college: 'National Institute of Engineering',
    department: 'Computer Science & Engineering',
    semester: '5',
    phone: '',
  });
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});
  const { setAuth }             = useAuthStore();
  const navigate                = useNavigate();

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.fullName)            e.fullName    = 'Full name is required';
    if (!form.usn)                 e.usn         = 'University Seat Number (USN) is required';
    if (!form.college)             e.college     = 'College is required';
    if (!form.email)               e.email       = 'Institutional email is required';
    if (form.password.length < 8)  e.password    = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { data } = await authApi.registerStudent({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        usn: form.usn,
        college: form.college,
        department: form.department,
        semester: form.semester ? parseInt(form.semester, 10) : 1,
        phone: form.phone || undefined,
      });

      if (data.data?.user) {
        setAuth({
          user: data.data.user,
          accessToken: data.data.accessToken || null,
          refreshToken: data.data.refreshToken || null,
        });
      }

      toast.success('Registration submitted! Your account is pending verification.');
      navigate('/pending-verification');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Student registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 40, paddingBottom: 40 }}>
      <AuthBackground />

      <div className="auth-card" style={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
        <Link to="/login/student" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,.4)', fontSize: '0.8rem', marginBottom: 20, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to student login
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 50,
            height: 50,
            background: 'rgba(255, 255, 255, 0.18)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 0 24px rgba(255,255,255,0.12), inset 0 1px 1px rgba(255,255,255,0.3)',
          }}>
            <GraduationCap size={24} color="#fff" />
          </div>
          <h1 style={{ fontFamily: "'Urbanist', system-ui, sans-serif", fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 4, textShadow: '0 1px 12px oklch(0 0 0 / 0.25)' }}>
            Create Student Account
          </h1>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '0.83rem' }}>
            Register your official credentials for campus identity verification
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Full Name */}
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)', pointerEvents: 'none' }} />
              <input
                name="fullName"
                type="text"
                className={`input ${errors.fullName ? 'error' : ''}`}
                style={{ paddingLeft: 34 }}
                placeholder="Aakash Verma"
                value={form.fullName}
                onChange={handleChange}
              />
            </div>
            {errors.fullName && <span className="input-error-msg">{errors.fullName}</span>}
          </div>

          <div className="grid-2" style={{ gap: 12 }}>
            {/* USN */}
            <div className="input-group">
              <label className="input-label">University Seat No (USN)</label>
              <div style={{ position: 'relative' }}>
                <Hash size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)', pointerEvents: 'none' }} />
                <input
                  name="usn"
                  type="text"
                  className={`input ${errors.usn ? 'error' : ''}`}
                  style={{ paddingLeft: 34 }}
                  placeholder="1RV21CS042"
                  value={form.usn}
                  onChange={handleChange}
                />
              </div>
              {errors.usn && <span className="input-error-msg">{errors.usn}</span>}
            </div>

            {/* Phone */}
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)', pointerEvents: 'none' }} />
                <input
                  name="phone"
                  type="tel"
                  className="input"
                  style={{ paddingLeft: 34 }}
                  placeholder="+91 9876543210"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="input-group">
            <label className="input-label">Institutional College Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)', pointerEvents: 'none' }} />
              <input
                name="email"
                type="email"
                className={`input ${errors.email ? 'error' : ''}`}
                style={{ paddingLeft: 34 }}
                placeholder="aakash.cs21@college.edu"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            {errors.email && <span className="input-error-msg">{errors.email}</span>}
          </div>

          <div className="grid-2" style={{ gap: 12 }}>
            {/* Department */}
            <div className="input-group">
              <label className="input-label">Branch / Department</label>
              <input
                name="department"
                type="text"
                className="input"
                placeholder="Computer Science"
                value={form.department}
                onChange={handleChange}
              />
            </div>

            {/* Semester */}
            <div className="input-group">
              <label className="input-label">Semester</label>
              <select
                name="semester"
                className="input"
                value={form.semester}
                onChange={handleChange}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Password */}
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Password (min 8 chars)</label>
              <div style={{ position: 'relative' }}>
                <input
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  className={`input ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
              {errors.password && <span className="input-error-msg">{errors.password}</span>}
            </div>

            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <input
                name="confirmPassword"
                type={showPwd ? 'text' : 'password'}
                className={`input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
              />
              {errors.confirmPassword && <span className="input-error-msg">{errors.confirmPassword}</span>}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Submitting Registration...' : 'Submit Student Registration'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.82rem', color: 'rgba(255,255,255,.55)' }}>
          Already have an account?{' '}
          <Link to="/login/student" style={{ color: '#ffffff', fontWeight: 600, textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.5)', textUnderlineOffset: '2px' }}>
            Student Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
