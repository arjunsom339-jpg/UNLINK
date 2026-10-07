import { useState, useEffect } from 'react';
import {
  Megaphone, BookOpen, MessageSquare, Users, Plus, ShieldCheck,
  CheckCircle, Clock, Send, Trash2, Pin, Eye, Award, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { teacherApi } from '../../api';

const INITIAL_TEACHER_ANNOUNCEMENTS = [
  {
    id: 't-ann-1',
    title: 'Laboratory Record Submission Deadline for 5th Sem CS',
    department: 'Computer Science & Engineering',
    category: 'academic',
    isPinned: true,
    publishedAt: 'Yesterday at 3:30 PM',
    views: 184,
    content: 'All students enrolled in Database Management Systems Lab (CS503L) must submit indexed and signed records by Friday 4 PM.'
  },
  {
    id: 't-ann-2',
    title: 'Research Internship Opportunities in AI & Computer Vision Lab',
    department: 'Computer Science & Engineering',
    category: 'workshop',
    isPinned: false,
    publishedAt: 'Oct 4',
    views: 295,
    content: 'Two funded undergraduate research intern positions are open for 6th and 7th semester students with proficiency in PyTorch.'
  }
];

const INITIAL_PENDING_QUESTIONS = [
  {
    id: 'q-p-1',
    studentName: 'Aakash Verma',
    semester: '5th Sem CSE',
    subject: 'Algorithms (CS501)',
    title: 'Can dynamic programming solve 0/1 Knapsack in polynomial time if weights are very large?',
    body: 'Standard table is O(nW). What happens when W is large (like 10^9) but value V is small (sum of values <= 1000)?',
    time: '2 hours ago',
    answered: false
  },
  {
    id: 'q-p-2',
    studentName: 'Priya Sharma',
    semester: '5th Sem CSE',
    subject: 'Operating Systems (CS502)',
    title: 'Clarification on Deadlock Detection vs Avoidance in Banker’s Algorithm',
    body: 'In case of single resource instance, does cycle in resource allocation graph always guarantee deadlock?',
    time: '4 hours ago',
    answered: false
  }
];

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const profile = user?.profile || {};

  const [announcements, setAnnouncements] = useState(INITIAL_TEACHER_ANNOUNCEMENTS);
  const [pendingQuestions, setPendingQuestions] = useState(INITIAL_PENDING_QUESTIONS);
  const [activeTab, setActiveTab] = useState('overview');

  // New Announcement Modal state
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [newAnn, setNewAnn] = useState({
    title: '',
    department: profile.department || 'Computer Science & Engineering',
    category: 'academic',
    content: '',
    isPinned: false
  });

  // Answer question modal state
  const [answeringQuestionId, setAnsweringQuestionId] = useState(null);
  const [answerText, setAnswerText] = useState('');

  // New Resource Modal state
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    subject: 'Algorithms (CS501)',
    semester: 5,
    link: ''
  });

  const handleCreateAnnouncement = (e) => {
    e.preventDefault();
    if (!newAnn.title || !newAnn.content) {
      toast.error('Please enter title and announcement content');
      return;
    }

    const created = {
      id: `t-ann-${Date.now()}`,
      title: newAnn.title,
      department: newAnn.department,
      category: newAnn.category,
      isPinned: newAnn.isPinned,
      publishedAt: 'Just now',
      views: 0,
      content: newAnn.content
    };

    setAnnouncements([created, ...announcements]);
    setShowAnnModal(false);
    setNewAnn({
      title: '',
      department: profile.department || 'Computer Science & Engineering',
      category: 'academic',
      content: '',
      isPinned: false
    });
    toast.success('Official announcement published to campus network!');
  };

  const handlePostAnswer = (questionId) => {
    if (!answerText.trim()) {
      toast.error('Please enter your faculty answer');
      return;
    }

    setPendingQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, answered: true } : q))
    );

    setAnsweringQuestionId(null);
    setAnswerText('');
    toast.success('Faculty verified response submitted to student!');
  };

  const handleDeleteAnnouncement = (id) => {
    setAnnouncements(announcements.filter((a) => a.id !== id));
    toast.success('Announcement removed');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Page Header & Faculty Banner ───────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(99,102,241,0.08) 100%)',
        border: '1px solid rgba(14,165,233,0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1.4rem'
          }}>
            {profile.fullName?.[0] || 'T'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {profile.fullName || user?.fullName || 'Faculty Professor'}
              </h1>
              <span className="badge badge-primary" style={{ background: 'rgba(14,165,233,0.15)', color: '#0284c7' }}>
                <ShieldCheck size={13} /> Verified Faculty
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {profile.designation || 'Professor'} • {profile.department || 'Computer Science & Engineering'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAnnModal(true)} style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}>
            <Plus size={15} /> Post Announcement
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowResourceModal(true)}>
            <BookOpen size={15} /> Upload Resource
          </button>
        </div>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────────── */}
      <div className="grid-4">
        {[
          { label: 'Announcements', value: announcements.length, icon: Megaphone, color: '#0ea5e9' },
          { label: 'Resources Shared', value: 8, icon: BookOpen, color: '#6366f1' },
          { label: 'Questions Solved', value: 34, icon: MessageSquare, color: '#10b981' },
          { label: 'Mentee Students', value: 18, icon: Users, color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: 'var(--radius-md)',
              background: `${s.color}18`,
              color: s.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <s.icon size={22} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Navigation Tabs ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-default)', paddingBottom: 10 }}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
        >
          My Announcements ({announcements.length})
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`btn btn-sm ${activeTab === 'questions' ? 'btn-primary' : 'btn-ghost'}`}
        >
          Student Q&A Assistance ({pendingQuestions.filter(q => !q.answered).length})
        </button>
      </div>

      {/* ── TAB 1: ANNOUNCEMENTS MANAGER ───────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {announcements.map((ann) => (
            <div key={ann.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {ann.isPinned && (
                    <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Pin size={11} /> Pinned
                    </span>
                  )}
                  <span className="badge badge-primary">{ann.category.toUpperCase()}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ann.publishedAt}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Eye size={13} /> {ann.views} views
                  </span>
                  <button
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-danger-500)', padding: 4 }}
                    title="Delete Announcement"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {ann.title}
              </h3>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {ann.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB 2: STUDENT Q&A QUEUE ───────────────────────────── */}
      {activeTab === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {pendingQuestions.map((q) => (
            <div key={q.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge badge-primary">{q.subject}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{q.time}</span>
                </div>
                {q.answered ? (
                  <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={12} /> Answered
                  </span>
                ) : (
                  <span className="badge badge-warning">Awaiting Faculty Guidance</span>
                )}
              </div>

              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {q.title}
              </h3>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {q.body}
              </p>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Asked by <strong>{q.studentName}</strong> ({q.semester})
              </div>

              {!q.answered && answeringQuestionId !== q.id && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-default)', paddingTop: 10 }}>
                  <button
                    onClick={() => setAnsweringQuestionId(q.id)}
                    className="btn btn-sm btn-primary"
                    style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}
                  >
                    Answer as Faculty
                  </button>
                </div>
              )}

              {answeringQuestionId === q.id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, background: 'var(--bg-surface-2)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Your Verified Faculty Answer
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Provide authoritative explanation, textbook references, or solution approach..."
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setAnsweringQuestionId(null)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => handlePostAnswer(q.id)}>
                      Submit Answer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE ANNOUNCEMENT MODAL ──────────────────────────── */}
      {showAnnModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="card" style={{ maxWidth: 540, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header">
              <h3 className="card-title">Post Faculty Announcement</h3>
              <button onClick={() => setShowAnnModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>

            <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Announcement Title</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Schedule for Final Year Project Progress Seminar"
                  value={newAnn.title}
                  onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <select
                    className="input"
                    value={newAnn.category}
                    onChange={(e) => setNewAnn({ ...newAnn, category: e.target.value })}
                  >
                    <option value="academic">Academic Circular</option>
                    <option value="event">Campus / Dept Event</option>
                    <option value="workshop">Workshop & Training</option>
                    <option value="urgent">Urgent Deadline</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Target Department</label>
                  <input
                    type="text"
                    className="input"
                    value={newAnn.department}
                    onChange={(e) => setNewAnn({ ...newAnn, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Announcement Details</label>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Include dates, venues, guidelines, or submission requirements..."
                  value={newAnn.content}
                  onChange={(e) => setNewAnn({ ...newAnn, content: e.target.value })}
                  required
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newAnn.isPinned}
                  onChange={(e) => setNewAnn({ ...newAnn, isPinned: e.target.checked })}
                />
                Pin to top of student portal
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAnnModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}>
                  <Send size={15} /> Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── UPLOAD RESOURCE MODAL ──────────────────────────────── */}
      {showResourceModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="card" style={{ maxWidth: 500, width: '100%' }}>
            <div className="card-header">
              <h3 className="card-title">Share Course Resource</h3>
              <button onClick={() => setShowResourceModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              toast.success(`Resource "${newResource.title}" uploaded to campus vault!`);
              setShowResourceModal(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Resource Title</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Unit 3 Dynamic Programming Lecture Slides & Solved Problems"
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Subject</label>
                  <input
                    type="text"
                    className="input"
                    value={newResource.subject}
                    onChange={(e) => setNewResource({ ...newResource, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Semester</label>
                  <select
                    className="input"
                    value={newResource.semester}
                    onChange={(e) => setNewResource({ ...newResource, semester: Number(e.target.value) })}
                  >
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">File / Drive / GitHub URL</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://drive.google.com/... or /uploads/..."
                  value={newResource.link}
                  onChange={(e) => setNewResource({ ...newResource, link: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowResourceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Upload Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
