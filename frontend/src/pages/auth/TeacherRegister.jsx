import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, User, Hash, Building, Phone, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api';
import useAuthStore from '../../store/authStore';

export default function TeacherRegister() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    teacherId: '',
    college: 'National Institute of Engineering',
    department: 'Computer Science & Engineering',
    designation: 'Assistant Professor',
    phone: '',
  });
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors,  setErrors]    = useState({});
  const { setAuth }             = useAuthStore();
  const navigate                = useNavigate();

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.fullName)            e.fullName    = 'Full name is required';
    if (!form.teacherId)           e.teacherId   = 'Teacher ID is required';
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
      const { data } = await authApi.registerTeacher({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        teacherId: form.teacherId,
        college: form.college,
        department: form.department,
        designation: form.designation,
        phone: form.phone || undefined,
      });

      if (data.data?.user) {
        setAuth({
          user: data.data.user,
          accessToken: data.data.accessToken || null,
          refreshToken: data.data.refreshToken || null,
        });
      }

      toast.success('Faculty registration submitted! Awaiting college administrative approval.');
      navigate('/pending-verification');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Faculty registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 40, paddingBottom: 40, background: 'linear-gradient(135deg, #0c1a2e 0%, #0d2444 50%, #0c1a2e 100%)' }}>
      <div style={{ position: 'absolute', top: '-150px', right: '-80px', width: 400, height: 400, background: 'radial-gradient(circle, rgba(14,165,233,.15) 0%, transparent 70%)', zIndex: 0 }} />

      <div className="auth-card" style={{ position: 'relative', zIndex: 1, maxWidth: 520, borderColor: 'rgba(14,165,233,.2)' }}>
        <Link to="/login/teacher" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,.4)', fontSize: '0.8rem', marginBottom: 20, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to faculty login
        </Link>

        {/* Notice */}
        <div style={{ background: 'rgba(14,165,233,.08)', border: '1px solid rgba(14,165,233,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: '0.82rem', color: '#7dd3fc', lineHeight: 1.4 }}>
          Teacher accounts are reviewed and verified by college administration before full access is activated.
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 50,
            height: 50,
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <BookOpen size={24} color="#fff" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            Request Faculty Access
          </h1>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '0.83rem' }}>
            Register your institutional employee credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Full Name */}
          <div className="input-group">
            <label className="input-label">Full Name with Title</label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)', pointerEvents: 'none' }} />
              <input
                name="fullName"
                type="text"
                className={`input ${errors.fullName ? 'error' : ''}`}
                style={{ paddingLeft: 34 }}
                placeholder="Dr. Ramesh Kumar"
                value={form.fullName}
                onChange={handleChange}
              />
            </div>
            {errors.fullName && <span className="input-error-msg">{errors.fullName}</span>}
          </div>

          <div className="grid-2" style={{ gap: 12 }}>
            {/* Teacher ID */}
            <div className="input-group">
              <label className="input-label">Faculty / Employee ID</label>
              <div style={{ position: 'relative' }}>
                <Hash size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)', pointerEvents: 'none' }} />
                <input
                  name="teacherId"
                  type="text"
                  className={`input ${errors.teacherId ? 'error' : ''}`}
                  style={{ paddingLeft: 34 }}
                  placeholder="EMP-CS-1042"
                  value={form.teacherId}
                  onChange={handleChange}
                />
              </div>
              {errors.teacherId && <span className="input-error-msg">{errors.teacherId}</span>}
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
                placeholder="ramesh.kumar@college.edu"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            {errors.email && <span className="input-error-msg">{errors.email}</span>}
          </div>

          <div className="grid-2" style={{ gap: 12 }}>
            {/* Department */}
            <div className="input-group">
              <label className="input-label">Department</label>
              <input
                name="department"
                type="text"
                className="input"
                placeholder="Computer Science & Engineering"
                value={form.department}
                onChange={handleChange}
              />
            </div>

            {/* Designation */}
            <div className="input-group">
              <label className="input-label">Designation</label>
              <input
                name="designation"
                type="text"
                className="input"
                placeholder="Professor / HOD"
                value={form.designation}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Password */}
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Password (min 8 chars)</label>
              <input
                name="password"
                type="password"
                className={`input ${errors.password ? 'error' : ''}`}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
              />
              {errors.password && <span className="input-error-msg">{errors.password}</span>}
            </div>

            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <input
                name="confirmPassword"
                type="password"
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
            style={{ marginTop: 8, background: '#0ea5e9', borderColor: '#0ea5e9' }}
          >
            {loading ? 'Submitting Application...' : 'Submit Faculty Application'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.82rem', color: 'rgba(255,255,255,.45)' }}>
          Already have verified access?{' '}
          <Link to="/login/teacher" style={{ color: '#38bdf8', fontWeight: 600, textDecoration: 'none' }}>
            Faculty Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
