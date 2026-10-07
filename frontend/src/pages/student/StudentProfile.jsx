import { useState, useEffect } from 'react';
import {
  User, Mail, Building, Hash, BookOpen, Star, Plus, X,
  Save, Check, Shield, Globe, Lock, Award, HeartHandshake, Eye,
  Phone, Calendar, Briefcase, Trophy, Code2, Sparkles, CheckCircle2,
  ExternalLink, Layers, AlertCircle, Ban
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { studentApi, skillApi } from '../../api';

export default function StudentProfile() {
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddSkillModalOpen, setIsAddSkillModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [blockedStudents, setBlockedStudents] = useState([]);

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    bio: '',
    semester: 5,
    availability: 'flexible',
    profileVisibility: 'campus',
    showPhone: false,
    phone: '',
    interests: [],
    preferredLearningAreas: [],
  });

  // Skill modal state
  const [skillForm, setSkillForm] = useState({
    skillName: '',
    skillType: 'known',
    proficiency: 'intermediate',
    canTeach: true,
    category: 'Programming',
  });

  // Project modal state
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    techStack: '',
    link: '',
  });

  const [skillsCatalog, setSkillsCatalog] = useState([]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await studentApi.getProfile();
      if (res.data?.data) {
        const p = res.data.data;
        setProfile(p);
        setEditForm({
          fullName: p.fullName || '',
          bio: p.bio || '',
          semester: p.semester || 5,
          availability: p.availability || 'flexible',
          profileVisibility: p.profileVisibility || 'campus',
          showPhone: !!p.showPhone,
          phone: p.phone || '',
          interests: p.interests || [],
          preferredLearningAreas: p.preferredLearningAreas || [],
        });
      }
    } catch {
      // Fallback to auth store profile
      if (user?.profile) {
        setProfile(user.profile);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBlockedStudents = async () => {
    try {
      const res = await studentApi.getBlockedStudents();
      if (res.data?.data) {
        setBlockedStudents(res.data.data);
      }
    } catch {
      // ignore
    }
  };

  const handleUnblockStudent = async (userId, studentName) => {
    try {
      await studentApi.unblockStudent(userId);
      toast.success(`Unblocked ${studentName || 'student'}`);
      fetchBlockedStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unblock.');
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchBlockedStudents();
    skillApi.getCatalog()
      .then((res) => {
        if (res.data?.data) setSkillsCatalog(res.data.data);
      })
      .catch(() => {});
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await studentApi.updateProfile(editForm);
      toast.success('Profile updated successfully!');
      if (res.data?.data) {
        setProfile(res.data.data);
        if (updateUser) {
          updateUser({ ...user, profile: res.data.data });
        }
      }
      setIsEditModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!skillForm.skillName.trim()) {
      toast.error('Please enter or select a skill.');
      return;
    }

    try {
      await studentApi.addSkill({
        skillName: skillForm.skillName.trim(),
        skillType: skillForm.skillType,
        proficiency: skillForm.proficiency,
        canTeach: skillForm.canTeach,
        category: skillForm.category,
      });
      toast.success(`Added ${skillForm.skillName} to profile!`);
      setIsAddSkillModalOpen(false);
      setSkillForm({ skillName: '', skillType: 'known', proficiency: 'intermediate', canTeach: true, category: 'Programming' });
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add skill.');
    }
  };

  const handleRemoveSkill = async (studentSkillId, skillName) => {
    try {
      await studentApi.removeSkill(studentSkillId);
      toast.success(`Removed ${skillName}`);
      fetchProfile();
    } catch (err) {
      toast.error('Failed to remove skill.');
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!projectForm.title.trim()) {
      toast.error('Project title is required.');
      return;
    }

    const currentProjects = profile?.projects || [];
    const newProject = {
      id: Date.now().toString(),
      title: projectForm.title.trim(),
      description: projectForm.description.trim(),
      techStack: projectForm.techStack.split(',').map((s) => s.trim()).filter(Boolean),
      link: projectForm.link.trim(),
    };

    try {
      await studentApi.updateProfile({
        projects: [...currentProjects, newProject],
      });
      toast.success('Project added to portfolio!');
      setIsAddProjectModalOpen(false);
      setProjectForm({ title: '', description: '', techStack: '', link: '' });
      fetchProfile();
    } catch (err) {
      toast.error('Failed to save project.');
    }
  };

  if (isLoading && !profile) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32 }} />
        <p>Loading your academic profile...</p>
      </div>
    );
  }

  const p = profile || user?.profile || {};
  const studentSkills = p.studentSkills || [];
  const knownSkills = studentSkills.filter((s) => s.skillType === 'known');
  const wantedSkills = studentSkills.filter((s) => s.skillType === 'wanted');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Top Profile Hero Card ──────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: 28,
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-2) 100%)',
          border: '1px solid var(--border-default)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          {/* Avatar & Core Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, var(--color-primary-500), #8b5cf6)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 800,
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {p.fullName ? p.fullName.slice(0, 2).toUpperCase() : 'ST'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {p.fullName || user?.fullName || 'Student Name'}
                </h1>
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={13} /> Verified Student
                </span>
                <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                  Availability: {p.availability || 'Flexible'}
                </span>
              </div>

              {/* Verified Academic Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-primary)', fontWeight: 600 }}>
                  <Building size={15} color="var(--color-primary-500)" />
                  {p.department || 'Computer Science & Engineering'}
                </span>
                <span>•</span>
                <span>Semester {p.semester || 5}</span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 4, color: 'var(--color-primary-600)', fontWeight: 700 }}>
                  <Lock size={12} /> USN: {p.usn || '1NIE21CS001'}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <User size={16} /> Edit Profile
            </button>
          </div>
        </div>

        {/* Gamification & Academic Stats Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 14,
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid var(--border-default)',
          }}
        >
          <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Star size={14} color="#f59e0b" /> Reputation Score
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              {p.reputationScore || 0} pts
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <HeartHandshake size={14} color="var(--color-primary-500)" /> Peer Connections
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              {p.connectionsCount || 0}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={14} color="#10b981" /> Helpful Answers
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              {p.helpfulAnswersCount || 0}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={14} color="#6366f1" /> Visibility
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4, textTransform: 'capitalize' }}>
              {p.profileVisibility || 'Campus'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-default)', paddingBottom: 8, overflowX: 'auto' }}>
        {[
          { key: 'overview', label: 'Overview & Bio', icon: User },
          { key: 'skills', label: 'Skills Matrix', icon: Code2, count: (knownSkills.length || (p.skillsKnown || []).length) },
          { key: 'portfolio', label: 'Projects & Collaborations', icon: Layers, count: (p.projects || []).length },
          { key: 'privacy', label: 'Privacy & Safety', icon: Shield },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
          >
            <tab.icon size={15} />
            {tab.label}
            {tab.count !== undefined && (
              <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ────────────────────────────────────────── */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid-2">
          {/* Bio card */}
          <div className="card">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <User size={18} color="var(--color-primary-500)" /> Student Bio
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.92rem' }}>
              {p.bio || 'No bio written yet. Click "Edit Profile" to introduce yourself and describe your academic passions!'}
            </p>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-default)' }}>
              <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10 }}>
                Interests & Focus Areas
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(p.interests && p.interests.length > 0 ? p.interests : ['Competitive Programming', 'Web Apps', 'AI Engineering']).map((tag) => (
                  <span key={tag} className="badge badge-primary" style={{ padding: '4px 10px' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Academic Identity Details */}
          <div className="card">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Shield size={18} color="#10b981" /> Institutional Credentials
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ color: 'var(--text-muted)' }}>College / University:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.college || 'National Institute of Engineering'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Department Branch:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.department || 'Computer Science'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ color: 'var(--text-muted)' }}>University Seat No (USN):</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Lock size={12} /> {p.usn}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Semester / Year:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Semester {p.semester}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Verification Status:</span>
                <span className="badge badge-success">Admin Verified</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SKILLS MATRIX */}
      {activeTab === 'skills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Peer Learning & Teaching Skills
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Categorized skills you can teach to peers, and skills you want to learn from campus mentors.
              </p>
            </div>
            <button onClick={() => setIsAddSkillModalOpen(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> Add Skill
            </button>
          </div>

          <div className="grid-2">
            {/* Skills I Know */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} color="#10b981" /> Skills I Know & Can Teach
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Showcased to students looking for mentors</span>
                </div>
              </div>

              {knownSkills.length === 0 && (!p.skillsKnown || p.skillsKnown.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                  <p>No skills added yet.</p>
                  <button onClick={() => { setSkillForm((s) => ({ ...s, skillType: 'known' })); setIsAddSkillModalOpen(true); }} className="btn btn-secondary btn-sm" style={{ marginTop: 10 }}>
                    Add Your First Skill
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {knownSkills.map((sk) => (
                    <div
                      key={sk.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-surface-2)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                            {sk.skill?.name || sk.skillId}
                          </span>
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.7rem',
                              textTransform: 'capitalize',
                              background: sk.proficiency === 'advanced' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                              color: sk.proficiency === 'advanced' ? '#10b981' : 'var(--color-primary-600)',
                            }}
                          >
                            {sk.proficiency}
                          </span>
                          {sk.canTeach && (
                            <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                              Willing to Teach
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {sk.skill?.category || 'Technical'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveSkill(sk.id, sk.skill?.name)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--color-danger-500)', padding: 6 }}
                        title="Remove skill"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skills I Want To Learn */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BookOpen size={18} color="var(--color-primary-500)" /> Skills I Want To Learn
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Used by UniLink's Skill Exchange engine to match you with peers</span>
                </div>
              </div>

              {wantedSkills.length === 0 && (!p.skillsWanted || p.skillsWanted.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                  <p>No learning goals specified yet.</p>
                  <button onClick={() => { setSkillForm((s) => ({ ...s, skillType: 'wanted' })); setIsAddSkillModalOpen(true); }} className="btn btn-secondary btn-sm" style={{ marginTop: 10 }}>
                    Add Learning Target
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {wantedSkills.map((sk) => (
                    <div
                      key={sk.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-surface-2)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                            {sk.skill?.name || sk.skillId}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
                            Target: {sk.proficiency}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {sk.skill?.category || 'Goal'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveSkill(sk.id, sk.skill?.name)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--color-danger-500)', padding: 6 }}
                        title="Remove goal"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PORTFOLIO & PROJECTS */}
      {activeTab === 'portfolio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Projects & Collaboration Portfolio
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Showcase your software applications, hackathon prototypes, and academic research.
              </p>
            </div>
            <button onClick={() => setIsAddProjectModalOpen(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> Add Project
            </button>
          </div>

          {(!p.projects || p.projects.length === 0) ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
              <Layers size={40} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No projects in portfolio yet</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Add your projects to attract collaborators and hackathon teammates.</p>
              <button onClick={() => setIsAddProjectModalOpen(true)} className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
                Add First Project
              </button>
            </div>
          ) : (
            <div className="grid-2">
              {p.projects.map((proj, idx) => (
                <div key={proj.id || idx} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                      {proj.title}
                    </h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                      {proj.description}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(proj.techStack || []).map((t) => (
                        <span key={t} className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {proj.link && (
                    <div style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid var(--border-default)' }}>
                      <a
                        href={proj.link}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--color-primary-600)', fontWeight: 600 }}
                      >
                        <ExternalLink size={14} /> View Repository / Live Demo
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PRIVACY & SETTINGS */}
      {activeTab === 'privacy' && (
        <div className="card" style={{ maxWidth: 700 }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Shield size={18} color="var(--color-primary-500)" /> Profile Visibility & Safety Controls
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                Profile Visibility Scope
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { value: 'campus', title: 'Campus Community (Recommended)', desc: 'Visible to verified students and teachers within your college campus.' },
                  { value: 'connections', title: 'Connections Only', desc: 'Detailed portfolio and bio are only visible to accepted connection peers.' },
                  { value: 'public', title: 'Public Academic Profile', desc: 'Searchable across the collegiate academic network.' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: 12,
                      background: editForm.profileVisibility === opt.value ? 'rgba(99,102,241,0.08)' : 'var(--bg-surface-2)',
                      border: editForm.profileVisibility === opt.value ? '1.5px solid var(--color-primary-500)' : '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="profileVisibility"
                      value={opt.value}
                      checked={editForm.profileVisibility === opt.value}
                      onChange={(e) => setEditForm({ ...editForm, profileVisibility: e.target.value })}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{opt.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>Show Phone Number to Connections</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>If disabled, your contact phone number is completely hidden.</div>
              </div>
              <input
                type="checkbox"
                checked={editForm.showPhone}
                onChange={(e) => setEditForm({ ...editForm, showPhone: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
            </div>

            <button
              onClick={handleSaveProfile}
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Save size={16} /> Save Privacy Settings
            </button>

            {/* Blocked Users Section */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-default)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Ban size={16} color="var(--color-danger-500)" /> Blocked Students ({blockedStudents.length})
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                Students you have blocked cannot message you, view your profile details, send connection requests, or appear in discovery.
              </p>

              {blockedStudents.length === 0 ? (
                <div style={{ padding: '16px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  You have not blocked any students.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {blockedStudents.map((b) => {
                    const studentName = b.blockedUser?.studentProfile?.fullName || b.blockedUser?.email || 'Student';
                    const dept = b.blockedUser?.studentProfile?.department || 'UniLink Member';
                    return (
                      <div
                        key={b.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: 'var(--bg-surface-2)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{studentName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dept}</div>
                          {b.reason && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 2 }}>Reason: {b.reason}</div>}
                        </div>
                        <button
                          onClick={() => handleUnblockStudent(b.blockedId, studentName)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-primary-600)', fontSize: '0.8rem' }}
                        >
                          Unblock
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT PROFILE ────────────────────────────────── */}
      {isEditModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 580,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Edit Student Profile
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Full Name */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="input"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  required
                />
              </div>

              {/* Locked Academic Identity Notification */}
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <Lock size={16} color="#d97706" />
                <span style={{ fontSize: '0.78rem', color: '#b45309' }}>
                  <strong>Verified USN ({p.usn})</strong> and College Department ({p.department}) are institutional records and cannot be edited by the student.
                </span>
              </div>

              {/* Bio */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Student Bio & Academic Summary
                </label>
                <textarea
                  className="input"
                  rows={4}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Describe your technical skills, hackathon projects, and what you are excited to learn..."
                />
              </div>

              {/* Semester & Availability */}
              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Current Semester
                  </label>
                  <select
                    className="input"
                    value={editForm.semester}
                    onChange={(e) => setEditForm({ ...editForm, semester: parseInt(e.target.value, 10) })}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Peer Availability
                  </label>
                  <select
                    className="input"
                    value={editForm.availability}
                    onChange={(e) => setEditForm({ ...editForm, availability: e.target.value })}
                  >
                    <option value="flexible">Flexible / Any Time</option>
                    <option value="weekends">Weekends Only</option>
                    <option value="evenings">Weekday Evenings</option>
                    <option value="busy">Busy / Exam Prep</option>
                  </select>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  className="input"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD SKILL ──────────────────────────────────── */}
      {isAddSkillModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Add Skill to Matrix
              </h3>
              <button onClick={() => setIsAddSkillModalOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSkill} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Type selector */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Skill Type
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setSkillForm({ ...skillForm, skillType: 'known', canTeach: true })}
                    className={`btn btn-sm ${skillForm.skillType === 'known' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                  >
                    Skills I Know
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkillForm({ ...skillForm, skillType: 'wanted', canTeach: false })}
                    className={`btn btn-sm ${skillForm.skillType === 'wanted' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                  >
                    Skills I Want To Learn
                  </button>
                </div>
              </div>

              {/* Skill name with suggestions */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Skill Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. React, Java, Machine Learning, UI/UX"
                  value={skillForm.skillName}
                  onChange={(e) => setSkillForm({ ...skillForm, skillName: e.target.value })}
                  required
                />
                {/* Popular pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {['React', 'Java', 'Python', 'Machine Learning', 'SQL', 'Docker', 'UI/UX'].map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSkillForm({ ...skillForm, skillName: name })}
                      className="badge badge-neutral"
                      style={{ cursor: 'pointer', border: 'none' }}
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Proficiency */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Proficiency Level
                </label>
                <select
                  className="input"
                  value={skillForm.proficiency}
                  onChange={(e) => setSkillForm({ ...skillForm, proficiency: e.target.value })}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Can teach checkbox if known */}
              {skillForm.skillType === 'known' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={skillForm.canTeach}
                    onChange={(e) => setSkillForm({ ...skillForm, canTeach: e.target.checked })}
                  />
                  <span>Willing to help/teach other students this skill</span>
                </label>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setIsAddSkillModalOpen(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD PROJECT ────────────────────────────────── */}
      {isAddProjectModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Add Project to Portfolio
              </h3>
              <button onClick={() => setIsAddProjectModalOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Project Title
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Smart Campus Navigator"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Project Description
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="What does the project do? What problems does it solve?"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Technologies Used (comma separated)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. React, Node.js, PostgreSQL, Docker"
                  value={projectForm.techStack}
                  onChange={(e) => setProjectForm({ ...projectForm, techStack: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Project / Repository Link (optional)
                </label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://github.com/username/project"
                  value={projectForm.link}
                  onChange={(e) => setProjectForm({ ...projectForm, link: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setIsAddProjectModalOpen(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
