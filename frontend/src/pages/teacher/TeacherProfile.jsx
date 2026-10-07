import { useState, useEffect } from 'react';
import {
  User, Building, BookOpen, ShieldCheck, Mail, Hash,
  Save, Plus, X, Award, MapPin, Clock, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { teacherApi } from '../../api';

const DESIGNATIONS = [
  'Professor & Head of Department',
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Visiting Faculty / Lecturer',
  'Dean of Academics',
  'Dean of Research & Development'
];

export default function TeacherProfile() {
  const { user, updateUser } = useAuthStore();
  const profile = user?.profile || {};

  const [formData, setFormData] = useState({
    fullName: profile.fullName || user?.fullName || 'Dr. Ramesh Kumar',
    employeeId: profile.employeeId || 'EMP-CS-1042',
    designation: profile.designation || 'Professor',
    department: profile.department || 'Computer Science & Engineering',
    cabinLocation: profile.cabinLocation || 'Academic Block 3, Cabin 312',
    officeHours: profile.officeHours || 'Mon, Wed, Fri 3:00 PM – 5:00 PM',
    bio: profile.bio || 'Doctorate in Distributed Systems with 14 years of teaching and research experience. Passionate about guiding undergraduate students in open source and AI projects.',
  });

  const [subjects, setSubjects] = useState(
    Array.isArray(profile.subjects) && profile.subjects.length > 0
      ? profile.subjects
      : ['Data Structures & Algorithms', 'Operating Systems', 'Cloud Computing & Microservices']
  );

  const [specializations, setSpecializations] = useState(
    Array.isArray(profile.specializations) && profile.specializations.length > 0
      ? profile.specializations
      : ['Distributed Systems', 'Cloud Architecture', 'High Performance Computing']
  );

  const [newSubject, setNewSubject] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    teacherApi.getProfile()
      .then((res) => {
        if (res.data?.data) {
          const p = res.data.data;
          setFormData((prev) => ({
            ...prev,
            fullName: p.fullName || prev.fullName,
            employeeId: p.employeeId || prev.employeeId,
            designation: p.designation || prev.designation,
            department: p.department || prev.department,
            cabinLocation: p.cabinLocation || prev.cabinLocation,
            officeHours: p.officeHours || prev.officeHours,
            bio: p.bio || prev.bio,
          }));
          if (p.subjects) setSubjects(p.subjects);
          if (p.specializations) setSpecializations(p.specializations);
        }
      })
      .catch(() => {});
  }, []);

  const handleAddTag = (list, setList, val, setVal) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (list.includes(trimmed)) {
      toast.error('Item already added');
      return;
    }
    setList([...list, trimmed]);
    setVal('');
  };

  const handleRemoveTag = (list, setList, item) => {
    setList(list.filter((x) => x !== item));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        subjects,
        specializations,
      };
      await teacherApi.updateProfile(payload);
      updateUser({
        profile: { ...profile, ...payload },
      });
      toast.success('Faculty profile updated successfully!');
    } catch (err) {
      updateUser({
        profile: { ...profile, ...formData, subjects, specializations },
      });
      toast.success('Faculty profile saved locally!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
          Faculty Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Manage your verified academic credentials, subjects handled, and student consultation availability.
        </p>
      </div>

      {/* ── Faculty Hero Card ──────────────────────────────────── */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(99,102,241,0.06) 100%)',
        borderColor: 'rgba(14,165,233,0.2)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 76,
              height: 76,
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.65rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              boxShadow: '0 8px 20px rgba(14,165,233,0.35)'
            }}>
              {formData.fullName[0] || 'T'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {formData.fullName}
                </h2>
                <span className="badge badge-primary" style={{ background: 'rgba(14,165,233,0.15)', color: '#0284c7' }}>
                  <ShieldCheck size={13} /> Verified Faculty
                </span>
                <span className="badge badge-success">
                  <CheckCircle size={13} /> Admin Approved
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Hash size={14} style={{ color: '#0ea5e9' }} />
                  {formData.employeeId}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Building size={14} style={{ color: '#6366f1' }} />
                  {formData.department}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Award size={14} style={{ color: '#f59e0b' }} />
                  {formData.designation}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form Body ─────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3 className="card-title">Professional & Departmental Details</h3>

          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">Full Name with Prefix</label>
              <input
                type="text"
                className="input"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Faculty Employee ID</label>
              <input
                type="text"
                className="input"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">Academic Designation</label>
              <select
                className="input"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              >
                {DESIGNATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Department</label>
              <input
                type="text"
                className="input"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">Campus Office / Cabin Location</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. CS Block 3rd Floor, Cabin 304"
                value={formData.cabinLocation}
                onChange={(e) => setFormData({ ...formData, cabinLocation: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Student Consultation / Office Hours</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Mon–Thu 2:00 PM – 4:00 PM"
                value={formData.officeHours}
                onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Faculty Biography & Research Overview</label>
            <textarea
              className="input"
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            />
          </div>
        </div>

        {/* Subjects Handled */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Courses & Subjects Taught</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Students in these courses will see your answers highlighted in academic discussions.
              </p>
            </div>
            <span className="badge badge-primary">{subjects.length} Subjects</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {subjects.map((sub) => (
              <span
                key={sub}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(14,165,233,0.12)',
                  color: '#0284c7',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: '1px solid rgba(14,165,233,0.25)'
                }}
              >
                {sub}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(subjects, setSubjects, sub)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="input"
              style={{ maxWidth: 360 }}
              placeholder="e.g. Compiler Design (CS601)"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(subjects, setSubjects, newSubject, setNewSubject);
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAddTag(subjects, setSubjects, newSubject, setNewSubject)}
            >
              <Plus size={16} /> Add Subject
            </button>
          </div>
        </div>

        {/* Research Specializations */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Research Areas & Specializations</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Matches student final year capstone projects and research queries with your domain.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {specializations.map((spec) => (
              <span
                key={spec}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(99,102,241,0.12)',
                  color: 'var(--color-primary-600)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: '1px solid rgba(99,102,241,0.25)'
                }}
              >
                {spec}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(specializations, setSpecializations, spec)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="input"
              style={{ maxWidth: 360 }}
              placeholder="e.g. Cryptography, Computer Vision, Robotics"
              value={newSpec}
              onChange={(e) => setNewSpec(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(specializations, setSpecializations, newSpec, setNewSpec);
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAddTag(specializations, setSpecializations, newSpec, setNewSpec)}
            >
              <Plus size={16} /> Add Specialization
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSaving}
            style={{ minWidth: 160, background: '#0ea5e9', borderColor: '#0ea5e9' }}
          >
            {isSaving ? 'Saving...' : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Save size={16} /> Save Profile
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
