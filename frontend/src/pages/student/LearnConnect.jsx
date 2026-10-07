import { useState, useEffect } from 'react';
import {
  BookOpen, Code2, HelpCircle, FolderOpen, Users, Star,
  Search, Plus, ArrowRight, CheckCircle, Download,
  ExternalLink, Sparkles, Filter, Award, UserPlus, HeartHandshake,
  Check, X, MessageSquare, Clock, Shield, RefreshCw, Send, Layers,
  Ban, Flag, UserX
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { studentApi, connectionApi, skillApi } from '../../api';

const DEPARTMENTS = [
  'All Departments',
  'Computer Science & Engineering',
  'Information Science & Engineering',
  'Artificial Intelligence & Machine Learning',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
];

export default function LearnConnect() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('exchange'); // 'exchange', 'learn', 'discover', 'connections', 'collaborate'
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedProficiency, setSelectedProficiency] = useState('all');

  // Data states
  const [exchangeMatches, setExchangeMatches] = useState([]);
  const [learnMatches, setLearnMatches] = useState([]);
  const [discoverStudents, setDiscoverStudents] = useState([]);
  const [myConnections, setMyConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({ received: [], sent: [] });
  const [projects, setProjects] = useState([]);
  const [hackathons, setHackathons] = useState([]);

  // Modals state
  const [connectModal, setConnectModal] = useState({ isOpen: false, targetUser: null, message: '' });
  const [joinModal, setJoinModal] = useState({ isOpen: false, item: null, type: 'project', role: '', message: '' });
  const [createProjectModal, setCreateProjectModal] = useState(false);
  const [blockModal, setBlockModal] = useState({ isOpen: false, targetUser: null, reason: '' });
  const [reportModal, setReportModal] = useState({ isOpen: false, targetUser: null, category: 'spam', description: '' });

  const [newProjectForm, setNewProjectForm] = useState({
    title: '',
    description: '',
    requiredSkills: '',
    teammatesRequired: 2,
    category: 'Web & Mobile',
  });

  // Load active tab data
  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'exchange') {
        const res = await studentApi.getSkillExchangeMatches();
        if (res.data?.data) setExchangeMatches(res.data.data);
      } else if (activeTab === 'learn') {
        const res = await studentApi.findPeopleToLearnFrom({ skill: searchTerm });
        if (res.data?.data) setLearnMatches(res.data.data);
      } else if (activeTab === 'discover') {
        const params = {
          q: searchTerm || undefined,
          department: selectedDept !== 'All Departments' ? selectedDept : undefined,
          proficiency: selectedProficiency !== 'all' ? selectedProficiency : undefined,
        };
        const res = await studentApi.discoverStudents(params);
        if (res.data?.data) setDiscoverStudents(res.data.data);
      } else if (activeTab === 'connections') {
        const [connRes, reqRes] = await Promise.all([
          connectionApi.getConnections(),
          connectionApi.getRequests(),
        ]);
        if (connRes.data?.data?.connections) setMyConnections(connRes.data.data.connections);
        if (reqRes.data?.data) setPendingRequests(reqRes.data.data);
      } else if (activeTab === 'collaborate') {
        const [projRes, hackRes] = await Promise.all([
          studentApi.getProjects(),
          studentApi.getHackathons(),
        ]);
        if (projRes.data?.data) setProjects(projRes.data.data);
        if (hackRes.data?.data) setHackathons(hackRes.data.data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, selectedDept, selectedProficiency]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Connection Request Action
  const handleOpenConnectModal = (targetUser) => {
    setConnectModal({
      isOpen: true,
      targetUser,
      message: `Hi ${targetUser.fullName || 'there'}, I noticed your profile on UniLink and would love to connect and exchange skills!`,
    });
  };

  const handleSendConnectionRequest = async () => {
    if (!connectModal.targetUser) return;
    try {
      await connectionApi.sendRequest({
        receiverId: connectModal.targetUser.userId || connectModal.targetUser.id,
        message: connectModal.message,
      });
      toast.success(`Connection request sent to ${connectModal.targetUser.fullName || 'student'}!`);
      setConnectModal({ isOpen: false, targetUser: null, message: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send request.');
    }
  };

  const handleAcceptRequest = async (requestId, studentName) => {
    try {
      await connectionApi.acceptRequest(requestId);
      toast.success(`Connected with ${studentName}! Reputation points awarded.`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept.');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await connectionApi.rejectRequest(requestId);
      toast.success('Connection request declined.');
      loadData();
    } catch (err) {
      toast.error('Failed to reject.');
    }
  };

  const handleRemoveConnection = async (connectionId) => {
    try {
      await connectionApi.removeConnection(connectionId);
      toast.success('Connection removed.');
      loadData();
    } catch (err) {
      toast.error('Failed to remove connection.');
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await connectionApi.cancelRequest(requestId);
      toast.success('Connection request cancelled.');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel request.');
    }
  };

  const handleBlockStudent = async () => {
    if (!blockModal.targetUser) return;
    try {
      const targetId = blockModal.targetUser.userId || blockModal.targetUser.id;
      await studentApi.blockStudent({ userId: targetId, reason: blockModal.reason });
      toast.success(`${blockModal.targetUser.fullName || 'Student'} has been blocked.`);
      setBlockModal({ isOpen: false, targetUser: null, reason: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to block student.');
    }
  };

  const handleReportStudent = async (e) => {
    e.preventDefault();
    if (!reportModal.targetUser) return;
    try {
      const targetId = reportModal.targetUser.userId || reportModal.targetUser.id;
      await studentApi.reportStudent({
        userId: targetId,
        category: reportModal.category,
        description: reportModal.description,
      });
      toast.success('Report submitted to moderation team.');
      setReportModal({ isOpen: false, targetUser: null, category: 'spam', description: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
    }
  };

  const handleAcceptProjectMember = async (projectId, memberId) => {
    try {
      await studentApi.acceptProjectMember(projectId, memberId);
      toast.success('Team member accepted!');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept member.');
    }
  };

  const handleRejectProjectMember = async (projectId, memberId) => {
    try {
      await studentApi.rejectProjectMember(projectId, memberId);
      toast.success('Join request declined.');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline member.');
    }
  };

  const handleAcceptHackathonMember = async (hackathonId, memberId) => {
    try {
      await studentApi.acceptHackathonMember(hackathonId, memberId);
      toast.success('Teammate accepted into hackathon roster!');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept member.');
    }
  };

  const handleRejectHackathonMember = async (hackathonId, memberId) => {
    try {
      await studentApi.rejectHackathonMember(hackathonId, memberId);
      toast.success('Teammate request declined.');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline member.');
    }
  };

  // Join Project / Hackathon
  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    const { item, type, role, message } = joinModal;
    try {
      if (type === 'project') {
        await studentApi.joinProject(item.id, { role, message });
        toast.success(`Join request sent to project lead!`);
      } else {
        await studentApi.joinHackathon(item.id, { role, message });
        toast.success(`Join request sent to hackathon team lead!`);
      }
      setJoinModal({ isOpen: false, item: null, type: 'project', role: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request.');
    }
  };

  // Create Project Submit
  const handleCreateProjectSubmit = async (e) => {
    e.preventDefault();
    try {
      await studentApi.createProject({
        title: newProjectForm.title,
        description: newProjectForm.description,
        requiredSkills: newProjectForm.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        teammatesRequired: parseInt(newProjectForm.teammatesRequired, 10),
        category: newProjectForm.category,
      });
      toast.success('Project opportunity published!');
      setCreateProjectModal(false);
      setNewProjectForm({ title: '', description: '', requiredSkills: '', teammatesRequired: 2, category: 'Web & Mobile' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="badge badge-primary" style={{ fontWeight: 800 }}>PEER LEARNING HUB</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Learn • Connect • Collaborate</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Learn & Connect
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 2 }}>
            Exchange skills, find student mentors, connect with campus peers, and form hackathon teams.
          </p>
        </div>

        <button
          onClick={loadData}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} className={isLoading ? 'spinner' : ''} /> Refresh
        </button>
      </div>

      {/* ── Search & Filter Bar ────────────────────────────────── */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: 38, height: 40 }}
              placeholder="Search students, skills (e.g. React, Java), or interests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="input"
            style={{ width: 'auto', height: 40 }}
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            className="input"
            style={{ width: 'auto', height: 40 }}
            value={selectedProficiency}
            onChange={(e) => setSelectedProficiency(e.target.value)}
          >
            <option value="all">Any Proficiency</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <button type="submit" className="btn btn-primary" style={{ height: 40, padding: '0 18px' }}>
            Search
          </button>
        </form>
      </div>

      {/* ── Feature Sub-Navigation Tabs ────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-default)', paddingBottom: 8, overflowX: 'auto' }}>
        {[
          { key: 'exchange', label: 'Skill Exchange Matches', icon: Sparkles, badge: exchangeMatches.length },
          { key: 'learn', label: 'Find Someone to Learn From', icon: BookOpen },
          { key: 'discover', label: 'Discover Students', icon: Users },
          { key: 'collaborate', label: 'Project & Hackathon Teams', icon: Layers },
          { key: 'connections', label: 'My Connections', icon: HeartHandshake, badge: pendingRequests.received.length ? `${pendingRequests.received.length} new` : undefined },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
          >
            <tab.icon size={15} />
            {tab.label}
            {tab.badge && (
              <span className={`badge ${tab.key === 'connections' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: SKILL EXCHANGE MATCHES ──────────────────────── */}
      {activeTab === 'exchange' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Reciprocal Skill Exchange Engine
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Students who know what you want to learn, and want to learn what you can teach.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 10px' }} />
              Calculating skill exchange compatibility...
            </div>
          ) : exchangeMatches.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
              <Sparkles size={40} style={{ margin: '0 auto 12px', color: '#f59e0b' }} />
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>No direct reciprocal matches found yet</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4, maxWidth: 500, margin: '6px auto 0' }}>
                Add more skills you know and skills you want to learn in your Student Profile to discover complementary peer exchanges!
              </p>
            </div>
          ) : (
            <div className="grid-2">
              {exchangeMatches.map((match, idx) => {
                const student = match.student;
                return (
                  <div
                    key={student.id || idx}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: match.matchScore >= 80 ? '1.5px solid rgba(16,185,129,0.4)' : '1px solid var(--border-default)',
                    }}
                  >
                    <div>
                      {/* Match header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 'var(--radius-md)',
                              background: 'linear-gradient(135deg, var(--color-primary-500), #8b5cf6)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '1rem',
                            }}
                          >
                            {student.fullName ? student.fullName.slice(0, 2).toUpperCase() : 'ST'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                              {student.fullName}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {student.department} • Sem {student.semester}
                            </div>
                          </div>
                        </div>

                        {/* Match score badge */}
                        <div style={{ textAlign: 'right' }}>
                          <span
                            className="badge"
                            style={{
                              background: match.matchScore >= 80 ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                              color: match.matchScore >= 80 ? '#10b981' : 'var(--color-primary-600)',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                            }}
                          >
                            {match.matchLabel} ({match.matchScore}%)
                          </span>
                        </div>
                      </div>

                      {/* Two-way exchange box */}
                      <div
                        style={{
                          background: 'var(--bg-surface-2)',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          fontSize: '0.85rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>They Teach You:</span>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>
                            {match.iLearn.join(', ') || 'Target skills'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>You Teach Them:</span>
                          <span style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>
                            {match.theyLearn.join(', ') || 'Complementary skills'}
                          </span>
                        </div>
                      </div>

                      {student.bio && !student.isRestricted && (
                        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                          {student.bio}
                        </p>
                      )}
                    </div>

                    {/* Footer connection action */}
                    <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        ⭐ {student.reputationScore || 0} Rep pts
                      </span>

                      {student.connectionStatus === 'accepted' ? (
                        <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={13} /> Connected
                        </span>
                      ) : student.connectionStatus === 'pending_sent' ? (
                        <span className="badge badge-neutral">Request Sent</span>
                      ) : (
                        <button
                          onClick={() => handleOpenConnectModal(student)}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <UserPlus size={14} /> Connect to Exchange
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: FIND PEOPLE TO LEARN FROM ───────────────────── */}
      {activeTab === 'learn' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Campus Peer Mentors & Tutors
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Students who know your target skill, have verified proficiency, and are willing to teach.
            </p>
          </div>

          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 10px' }} /> Loading tutors...
            </div>
          ) : learnMatches.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
              <BookOpen size={40} style={{ margin: '0 auto 12px', color: 'var(--color-primary-500)' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No mentors found for current search filter</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Try searching for a different skill like "React", "Python", or "Java".</p>
            </div>
          ) : (
            <div className="grid-2">
              {learnMatches.map((m) => (
                <div key={m.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          {m.fullName}
                        </h4>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {m.department} • Sem {m.semester}
                        </div>
                      </div>
                      <span className="badge badge-success">Can Teach</span>
                    </div>

                    <div style={{ background: 'var(--bg-surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Teaching: </span>
                      <strong style={{ color: 'var(--color-primary-600)' }}>{m.matchedSkill?.name}</strong>
                      <span className="badge badge-neutral" style={{ marginLeft: 8, fontSize: '0.7rem', textTransform: 'capitalize' }}>
                        {m.matchedSkill?.proficiency}
                      </span>
                    </div>

                    {m.bio && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                        {m.bio}
                      </p>
                    )}
                  </div>

                  <div style={{ paddingTop: 10, borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      ⭐ {m.reputationScore || 0} pts
                    </span>

                    {m.connectionStatus === 'accepted' ? (
                      <span className="badge badge-success">Connected</span>
                    ) : m.connectionStatus === 'pending_sent' ? (
                      <span className="badge badge-neutral">Request Sent</span>
                    ) : (
                      <button onClick={() => handleOpenConnectModal(m)} className="btn btn-primary btn-sm">
                        <UserPlus size={14} /> Request Mentorship
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: DISCOVER STUDENTS ───────────────────────────── */}
      {activeTab === 'discover' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Campus Student Directory
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Explore students across departments, view their skills, and connect for collaboration.
            </p>
          </div>

          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 10px' }} /> Loading students...
            </div>
          ) : discoverStudents.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
              <Users size={40} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No students match current search query</p>
            </div>
          ) : (
            <div className="grid-3">
              {discoverStudents.map((st) => (
                <div key={st.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 'var(--radius-md)',
                          background: 'linear-gradient(135deg, var(--color-primary-500), #8b5cf6)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                        }}
                      >
                        {st.fullName ? st.fullName.slice(0, 2).toUpperCase() : 'ST'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {st.fullName}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <button
                              onClick={() => setReportModal({ isOpen: true, targetUser: st, category: 'spam', description: '' })}
                              className="btn btn-ghost btn-xs"
                              title="Report student"
                              style={{ color: 'var(--text-muted)', padding: '2px 4px' }}
                            >
                              <Flag size={12} />
                            </button>
                            <button
                              onClick={() => setBlockModal({ isOpen: true, targetUser: st, reason: '' })}
                              className="btn btn-ghost btn-xs"
                              title="Block student"
                              style={{ color: 'var(--color-danger-500)', padding: '2px 4px' }}
                            >
                              <Ban size={12} />
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {st.department} • Sem {st.semester}
                        </div>
                      </div>
                    </div>

                    {/* Skills pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {(st.skillsKnown || []).slice(0, 4).map((sk) => (
                        <span key={sk} className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                          {sk}
                        </span>
                      ))}
                    </div>

                    {st.bio && !st.isRestricted && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 12 }}>
                        {st.bio.slice(0, 100)}...
                      </p>
                    )}
                  </div>

                  <div style={{ paddingTop: 10, borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      ⭐ {st.reputationScore || 0} pts
                    </span>

                    {st.connectionStatus === 'accepted' ? (
                      <span className="badge badge-success">Connected</span>
                    ) : st.connectionStatus === 'pending_sent' ? (
                      <span className="badge badge-neutral">Pending</span>
                    ) : (
                      <button onClick={() => handleOpenConnectModal(st)} className="btn btn-primary btn-sm">
                        <UserPlus size={14} /> Connect
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: PROJECTS & HACKATHON TEAMS ───────────────────── */}
      {activeTab === 'collaborate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Collaborative Opportunities & Hackathon Teams
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Join open student projects or recruit teammates for upcoming national hackathons.
              </p>
            </div>
            <button onClick={() => setCreateProjectModal(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> Post Project Opportunity
            </button>
          </div>

          <div className="grid-2">
            {/* Project List */}
            {projects.map((proj) => (
              <div key={proj.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem', marginBottom: 4 }}>
                        {proj.category}
                      </span>
                      <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {proj.title}
                      </h4>
                    </div>
                    <span className="badge badge-success">{proj.status}</span>
                  </div>

                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                    {proj.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {(proj.requiredSkills || []).map((sk) => (
                      <span key={sk} className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                        {sk}
                      </span>
                    ))}
                  </div>
                  {/* Pending Join Requests for Project Lead */}
                  {proj.creatorId === user?.id && proj.members && proj.members.filter((m) => m.status === 'pending').length > 0 && (
                    <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d97706', marginBottom: 6 }}>
                        Pending Join Requests ({proj.members.filter((m) => m.status === 'pending').length})
                      </div>
                      {proj.members.filter((m) => m.status === 'pending').map((mem) => (
                        <div key={mem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginBottom: 6 }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{mem.user?.studentProfile?.fullName || mem.user?.email}</span>
                            <span style={{ color: 'var(--text-muted)' }}> ({mem.role})</span>
                            {mem.message && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{mem.message}"</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleRejectProjectMember(proj.id, mem.id)} className="btn btn-ghost btn-xs" style={{ color: 'var(--color-danger-500)' }}>Decline</button>
                            <button onClick={() => handleAcceptProjectMember(proj.id, mem.id)} className="btn btn-primary btn-xs" style={{ background: '#10b981', borderColor: '#10b981' }}>Accept</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Team: {proj.currentTeamSize} / {proj.teammatesRequired + 1} members
                  </span>

                  {proj.creatorId === user?.id ? (
                    <span className="badge badge-neutral">You are Lead</span>
                  ) : (
                    <button
                      onClick={() => setJoinModal({ isOpen: true, item: proj, type: 'project', role: 'Frontend Contributor', message: '' })}
                      className="btn btn-primary btn-sm"
                    >
                      Request to Join
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Hackathons Section */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>
              Hackathon Teams & Roster ({hackathons.length})
            </h3>
            {hackathons.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                No active hackathon recruitment listings right now.
              </div>
            ) : (
              <div className="grid-2">
                {hackathons.map((hack) => (
                  <div key={hack.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem', marginBottom: 4 }}>
                            {hack.lookingFor || 'Teammates'}
                          </span>
                          <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            {hack.title}
                          </h4>
                        </div>
                        <span className="badge badge-success">{hack.status}</span>
                      </div>
                      <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                        {hack.description}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {(hack.requiredSkills || []).map((sk) => (
                          <span key={sk} className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                            {sk}
                          </span>
                        ))}
                      </div>

                      {/* Pending Hackathon Applications for Lead */}
                      {hack.creatorId === user?.id && hack.members && hack.members.filter((m) => m.status === 'pending').length > 0 && (
                        <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d97706', marginBottom: 6 }}>
                            Pending Applications ({hack.members.filter((m) => m.status === 'pending').length})
                          </div>
                          {hack.members.filter((m) => m.status === 'pending').map((mem) => (
                            <div key={mem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginBottom: 6 }}>
                              <div>
                                <span style={{ fontWeight: 600 }}>{mem.user?.studentProfile?.fullName || mem.user?.email}</span>
                                <span style={{ color: 'var(--text-muted)' }}> ({mem.role})</span>
                                {mem.message && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{mem.message}"</div>}
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => handleRejectHackathonMember(hack.id, mem.id)} className="btn btn-ghost btn-xs" style={{ color: 'var(--color-danger-500)' }}>Decline</button>
                                <button onClick={() => handleAcceptHackathonMember(hack.id, mem.id)} className="btn btn-primary btn-xs" style={{ background: '#10b981', borderColor: '#10b981' }}>Accept</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Team: {hack.currentMembersCount} / {hack.teamSize} members
                      </span>

                      {hack.creatorId === user?.id ? (
                        <span className="badge badge-neutral">You are Lead</span>
                      ) : (
                        <button
                          onClick={() => setJoinModal({ isOpen: true, item: hack, type: 'hackathon', role: 'Developer', message: '' })}
                          className="btn btn-primary btn-sm"
                        >
                          Request to Join
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: MY CONNECTIONS & REQUESTS ───────────────────── */}
      {activeTab === 'connections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Pending Incoming Requests */}
          {pendingRequests.received.length > 0 && (
            <div className="card" style={{ border: '1.5px solid #f59e0b' }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d97706', marginBottom: 14 }}>
                <Clock size={18} /> Incoming Connection Requests ({pendingRequests.received.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingRequests.received.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-surface-2)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {req.requester?.studentProfile?.fullName || req.requester?.email}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {req.requester?.studentProfile?.department} • Sem {req.requester?.studentProfile?.semester}
                      </div>
                      {req.message && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                          "{req.message}"
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="btn btn-sm btn-ghost"
                        style={{ color: 'var(--color-danger-500)' }}
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAcceptRequest(req.id, req.requester?.studentProfile?.fullName)}
                        className="btn btn-sm btn-primary"
                        style={{ background: '#10b981', borderColor: '#10b981' }}
                      >
                        Accept & Connect (+10 pts)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing Connection Requests */}
          {pendingRequests.sent && pendingRequests.sent.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--color-primary-500)' }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary-500)', marginBottom: 14 }}>
                <Clock size={18} /> Outgoing Connection Requests ({pendingRequests.sent.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingRequests.sent.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-surface-2)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {req.receiver?.studentProfile?.fullName || req.receiver?.email}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {req.receiver?.studentProfile?.department} • Sem {req.receiver?.studentProfile?.semester}
                      </div>
                      {req.message && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                          "{req.message}"
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleCancelRequest(req.id)}
                      className="btn btn-sm btn-ghost"
                      style={{ color: 'var(--color-danger-500)' }}
                    >
                      Cancel Request
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Connections */}
          <div className="card">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <HeartHandshake size={18} color="var(--color-primary-500)" />
              Active Peer Network ({myConnections.length})
            </h3>

            {myConnections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <p>No active connections yet.</p>
                <p style={{ fontSize: '0.82rem', marginTop: 4 }}>Explore the "Skill Exchange" or "Discover" tabs to connect with students!</p>
              </div>
            ) : (
              <div className="grid-2">
                {myConnections.map((conn) => (
                  <div
                    key={conn.connectionId}
                    style={{
                      background: 'var(--bg-surface-2)',
                      padding: 14,
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {conn.partner.profile?.fullName || conn.partner.email}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {conn.partner.profile?.department} • Sem {conn.partner.profile?.semester}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => setReportModal({ isOpen: true, targetUser: conn.partner.profile || { fullName: conn.partner.email, userId: conn.partner.userId }, category: 'spam', description: '' })}
                        className="btn btn-ghost btn-sm"
                        title="Report user"
                        style={{ color: 'var(--text-muted)', padding: '4px 6px' }}
                      >
                        <Flag size={14} />
                      </button>
                      <button
                        onClick={() => setBlockModal({ isOpen: true, targetUser: conn.partner.profile || { fullName: conn.partner.email, userId: conn.partner.userId }, reason: '' })}
                        className="btn btn-ghost btn-sm"
                        title="Block user"
                        style={{ color: 'var(--color-danger-500)', padding: '4px 6px' }}
                      >
                        <Ban size={14} />
                      </button>
                      <button
                        onClick={() => handleRemoveConnection(conn.connectionId)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--color-danger-500)', fontSize: '0.75rem' }}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: CONNECT WITH NOTE ───────────────────────────── */}
      {connectModal.isOpen && (
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
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Connect with {connectModal.targetUser?.fullName}
              </h3>
              <button onClick={() => setConnectModal({ isOpen: false, targetUser: null, message: '' })} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Introduction / Skill Exchange Note
                </label>
                <textarea
                  className="input"
                  rows={4}
                  value={connectModal.message}
                  onChange={(e) => setConnectModal({ ...connectModal, message: e.target.value })}
                  placeholder="Mention why you want to connect, what skills you'd like to learn or collaborate on..."
                  maxLength={300}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block', textAlign: 'right' }}>
                  {connectModal.message.length} / 300 characters
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => setConnectModal({ isOpen: false, targetUser: null, message: '' })} className="btn btn-ghost">
                  Cancel
                </button>
                <button onClick={handleSendConnectionRequest} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Send size={15} /> Send Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: JOIN PROJECT / HACKATHON ────────────────────── */}
      {joinModal.isOpen && (
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
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Join: {joinModal.item?.title}
              </h3>
              <button onClick={() => setJoinModal({ isOpen: false, item: null, type: 'project', role: '', message: '' })} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Desired Team Role
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Frontend Specialist, ML Engineer, Pitch Lead"
                  value={joinModal.role}
                  onChange={(e) => setJoinModal({ ...joinModal, role: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Pitch / Relevant Experience Note
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Briefly describe what you bring to the team, past projects, or github links..."
                  value={joinModal.message}
                  onChange={(e) => setJoinModal({ ...joinModal, message: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setJoinModal({ isOpen: false, item: null, type: 'project', role: '', message: '' })} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE PROJECT ──────────────────────────────── */}
      {createProjectModal && (
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
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Publish Collaboration Opportunity
              </h3>
              <button onClick={() => setCreateProjectModal(false)} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Project Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Campus Food Waste Tracker & Redistribution"
                  value={newProjectForm.title}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Description
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="What is the project about and what problem are you solving together?"
                  value={newProjectForm.description}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Required Skills (comma separated)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. React, Python, PostgreSQL"
                    value={newProjectForm.requiredSkills}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, requiredSkills: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Teammates Required
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="input"
                    value={newProjectForm.teammatesRequired}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, teammatesRequired: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setCreateProjectModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Publish Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: BLOCK STUDENT ───────────────────────────────── */}
      {blockModal.isOpen && (
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
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-danger-500)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ban size={20} /> Block Student
              </h3>
              <button onClick={() => setBlockModal({ isOpen: false, targetUser: null, reason: '' })} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Are you sure you want to block <strong>{blockModal.targetUser?.fullName || 'this student'}</strong>? They will not be able to message you, send connection requests, or view your profile.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Reason (optional)
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Inappropriate messages"
                value={blockModal.reason}
                onChange={(e) => setBlockModal({ ...blockModal, reason: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setBlockModal({ isOpen: false, targetUser: null, reason: '' })} className="btn btn-ghost">
                Cancel
              </button>
              <button onClick={handleBlockStudent} className="btn btn-primary" style={{ background: 'var(--color-danger-500)', borderColor: 'var(--color-danger-500)' }}>
                Block Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REPORT STUDENT ──────────────────────────────── */}
      {reportModal.isOpen && (
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
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Flag size={20} color="#f59e0b" /> Report Profile or Behavior
              </h3>
              <button onClick={() => setReportModal({ isOpen: false, targetUser: null, category: 'spam', description: '' })} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Reporting <strong>{reportModal.targetUser?.fullName || 'student'}</strong>. Reports are handled confidentially by UniLink Campus Administrators.
            </p>

            <form onSubmit={handleReportStudent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Violation Category
                </label>
                <select
                  className="input"
                  value={reportModal.category}
                  onChange={(e) => setReportModal({ ...reportModal, category: e.target.value })}
                  required
                >
                  <option value="spam">Spam or Unsolicited Promotion</option>
                  <option value="harassment">Harassment or Unwanted Contact</option>
                  <option value="fake_profile">Fake Profile or Misrepresented Identity</option>
                  <option value="inappropriate_content">Inappropriate Content</option>
                  <option value="misuse">Platform Misuse / Academic Dishonesty</option>
                  <option value="other">Other Violation</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Details & Description
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Provide context on what happened..."
                  value={reportModal.description}
                  onChange={(e) => setReportModal({ ...reportModal, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setReportModal({ isOpen: false, targetUser: null, category: 'spam', description: '' })} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
