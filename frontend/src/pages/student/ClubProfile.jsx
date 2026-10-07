import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Compass, Users, Calendar, Megaphone, Activity, Award, Shield,
  Settings, LogOut, CheckCircle, Clock, MapPin, Mail, Globe,
  AlertTriangle, Flag, ArrowLeft, Plus, ExternalLink, UserCheck
} from 'lucide-react';
import { clubsApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function ClubProfile() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview | announcements | activities | leadership | elections | members

  // Tab data states
  const [announcements, setAnnouncements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [leadership, setLeadership] = useState([]);
  const [elections, setElections] = useState([]);
  const [members, setMembers] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // User membership in this club
  const [myMembership, setMyMembership] = useState(null);
  const [joining, setJoining] = useState(false);

  const fetchClubDetails = async () => {
    try {
      setLoading(true);
      const [resClub, resMy] = await Promise.all([
        clubsApi.getClubById(id),
        clubsApi.getMyClubs(),
      ]);

      setClub(resClub.data?.data || null);
      const mem = (resMy.data?.data || []).find((m) => (m.clubId || m.club?.id) === id);
      setMyMembership(mem || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load club details');
      navigate('/student/clubs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubDetails();
  }, [id]);

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (!club) return;
    const loadTabData = async () => {
      try {
        setTabLoading(true);
        if (activeTab === 'announcements') {
          const res = await clubsApi.getAnnouncements(id);
          setAnnouncements(res.data?.data || []);
        } else if (activeTab === 'activities') {
          const res = await clubsApi.getActivities(id);
          setActivities(res.data?.data || []);
        } else if (activeTab === 'leadership') {
          const res = await clubsApi.getClubLeadership(id);
          setLeadership(res.data?.data || []);
        } else if (activeTab === 'elections') {
          const res = await clubsApi.getElections(id);
          setElections(res.data?.data || []);
        } else if (activeTab === 'members') {
          const res = await clubsApi.getClubMembers(id);
          setMembers(res.data?.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setTabLoading(false);
      }
    };
    loadTabData();
  }, [id, activeTab, club]);

  const handleJoin = async () => {
    try {
      setJoining(true);
      const res = await clubsApi.joinClub(id);
      toast.success(res.data?.message || 'Membership applied successfully!');
      await fetchClubDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply for membership');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this club?')) return;
    try {
      setJoining(true);
      await clubsApi.leaveClub(id);
      toast.success('You have left the club');
      await fetchClubDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave club');
    } finally {
      setJoining(false);
    }
  };

  const handleReport = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) {
      toast.error('Please specify a reason for this report.');
      return;
    }
    try {
      setSubmittingReport(true);
      await clubsApi.reportClub(id, {
        category: 'club_violation',
        description: reportReason,
      });
      toast.success('Report submitted to college administrators for moderation.');
      setShowReportModal(false);
      setReportReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading || !club) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <p>Loading club profile...</p>
      </div>
    );
  }

  const isLeader = myMembership?.role && ['PRESIDENT', 'VICE_PRESIDENT', 'OFFICER', 'SECRETARY', 'TREASURER'].includes(myMembership.role);
  const isAdmin = user?.role === 'admin';
  const canManage = isLeader || isAdmin;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      {/* ── Back Navigation ─────────────────────────────────── */}
      <button
        onClick={() => navigate('/student/clubs')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '0.88rem',
          fontWeight: 600,
          marginBottom: 16,
          padding: 0,
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Campus Clubs</span>
      </button>

      {/* ── Club Hero Banner ────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-default)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 24,
      }}>
        {/* Banner */}
        <div style={{
          height: 160,
          background: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 40%, #7c3aed 80%, #db2777 100%)',
          position: 'relative',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}>
              {club.category}
            </span>
            {club.department && (
              <span style={{
                padding: '4px 12px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.25)',
                color: '#fff',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}>
                {club.department.code || club.department.name}
              </span>
            )}
          </div>
        </div>

        {/* Profile Info Header */}
        <div style={{ padding: '0 24px 20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginTop: -44 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
            <div style={{
              width: 88,
              height: 88,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-surface)',
              border: '4px solid var(--bg-surface)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '2rem',
              color: 'var(--color-primary-600)',
            }}>
              {club.shortName || club.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                {club.name}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {club.shortName && (
                  <span style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>
                    [{club.shortName}]
                  </span>
                )}
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={14} />
                  <strong>{club.memberCount || 0}</strong> active members
                </span>
                {club.foundedYear && (
                  <>
                    <span>•</span>
                    <span>Est. {club.foundedYear}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {canManage && (
              <button
                onClick={() => navigate(`/student/clubs/${club.id}/manage`)}
                className="btn btn--primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px' }}
              >
                <Settings size={16} />
                <span>Leadership Console</span>
              </button>
            )}

            {myMembership?.status === 'ACTIVE' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: '#ecfdf5',
                  color: '#059669',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <CheckCircle size={16} />
                  <span>{myMembership.role}</span>
                </span>
                <button
                  onClick={handleLeave}
                  disabled={joining}
                  className="btn btn--outline"
                  style={{ color: 'var(--color-danger-500)', padding: '9px 12px' }}
                  title="Leave Club"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : myMembership?.status === 'PENDING' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: '#fef3c7',
                  color: '#d97706',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <Clock size={16} />
                  <span>Request Pending</span>
                </span>
                <button
                  onClick={handleLeave}
                  disabled={joining}
                  className="btn btn--outline"
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="btn btn--primary"
                style={{ padding: '9px 20px', fontSize: '0.92rem' }}
              >
                {joining ? 'Submitting...' : 'Join Club'}
              </button>
            )}

            <button
              onClick={() => setShowReportModal(true)}
              style={{
                background: 'none',
                border: '1px solid var(--border-default)',
                color: 'var(--text-muted)',
                borderRadius: 'var(--radius-md)',
                padding: '9px 12px',
                cursor: 'pointer',
              }}
              title="Report Club for Moderation"
            >
              <Flag size={15} />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div style={{
          display: 'flex',
          gap: 2,
          padding: '0 24px',
          borderTop: '1px solid var(--border-default)',
          background: 'var(--bg-surface-2)',
          overflowX: 'auto',
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: Compass },
            { id: 'announcements', label: 'Announcements', icon: Megaphone },
            { id: 'activities', label: 'Activities', icon: Activity },
            { id: 'leadership', label: 'Leadership', icon: Award },
            { id: 'elections', label: 'Elections', icon: Shield },
            { id: 'members', label: 'Members', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 18px',
                border: 'none',
                background: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderBottom: activeTab === tab.id ? '2px solid var(--color-primary-600)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--color-primary-600)' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW ─────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          {/* Main Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Description & Mission */}
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              padding: 24,
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1.15rem', fontWeight: 700 }}>About the Society</h3>
              <p style={{ margin: 0, fontSize: '0.93rem', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                {club.description}
              </p>
            </div>

            {/* Meetings & Schedule */}
            {(club.meetingLocation || club.meetingSchedule) && (
              <div style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                padding: 24,
              }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '1.15rem', fontWeight: 700 }}>Meetings & Location</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {club.meetingLocation && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
                      <MapPin size={18} style={{ color: 'var(--color-primary-600)' }} />
                      <span><strong>Venue:</strong> {club.meetingLocation}</span>
                    </div>
                  )}
                  {club.meetingSchedule && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
                      <Calendar size={18} style={{ color: 'var(--color-primary-600)' }} />
                      <span><strong>Schedule:</strong> {club.meetingSchedule}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Associated Events */}
            {club.events && club.events.length > 0 && (
              <div style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                padding: 24,
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 700 }}>Campus Events</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {club.events.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: 14,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-surface-2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem', fontWeight: 700 }}>{ev.title}</h4>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {new Date(ev.startDateTime).toLocaleDateString()} • {ev.venue}
                        </span>
                      </div>
                      <button
                        onClick={() => navigate('/student/events')}
                        className="btn btn--outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Event Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Quick Details Card */}
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              padding: 20,
            }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Society Information
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>CATEGORY</span>
                  <strong>{club.category}</strong>
                </div>

                {club.facultyAdvisor && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>FACULTY ADVISOR</span>
                    <strong>{club.facultyAdvisor.fullName || club.facultyAdvisor.user?.email}</strong>
                  </div>
                )}

                {club.contactEmail && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>CONTACT EMAIL</span>
                    <a href={`mailto:${club.contactEmail}`} style={{ color: 'var(--color-primary-600)', textDecoration: 'none' }}>
                      {club.contactEmail}
                    </a>
                  </div>
                )}

                {club.website && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>WEBSITE</span>
                    <a href={club.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary-600)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>Visit Site</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>APPROVAL REQUIRED</span>
                  <span>{club.membershipApprovalRequired ? 'Yes (Leadership approval)' : 'Open (Immediate join)'}</span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>ELECTIONS</span>
                  <span>{club.electionsEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ANNOUNCEMENTS ────────────────────────────── */}
      {activeTab === 'announcements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tabLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-default)' }}>
              <Megaphone size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No announcements posted yet.</p>
            </div>
          ) : (
            announcements.map((ann) => (
              <div
                key={ann.id}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: ann.pinned ? '2px solid var(--color-primary-400)' : '1px solid var(--border-default)',
                  padding: 20,
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{ann.title}</h3>
                    {ann.pinned && (
                      <span style={{ padding: '2px 8px', borderRadius: 12, background: 'var(--color-primary-100)', color: 'var(--color-primary-700)', fontSize: '0.72rem', fontWeight: 700 }}>
                        PINNED
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(ann.publishedAt || ann.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: '0.92rem', lineHeight: 1.5, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                  {ann.content}
                </p>
                {ann.author && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Posted by {ann.author.email}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB 3: ACTIVITIES ───────────────────────────────── */}
      {activeTab === 'activities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tabLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading activities...</div>
          ) : activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-default)' }}>
              <Activity size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No scheduled activities right now.</p>
            </div>
          ) : (
            activities.map((act) => (
              <div
                key={act.id}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  padding: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'var(--bg-surface-2)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}>
                      {act.activityType}
                    </span>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{act.title}</h4>
                    {act.visibility === 'CLUB_ONLY' && (
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: '#fef3c7', color: '#b45309', fontSize: '0.72rem', fontWeight: 700 }}>
                        MEMBERS ONLY
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    {act.description}
                  </p>
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <span>Start: {new Date(act.startAt).toLocaleString()}</span>
                    {act.location && <span>Venue: {act.location}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB 4: LEADERSHIP ───────────────────────────────── */}
      {activeTab === 'leadership' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {tabLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0' }}>Loading leadership...</div>
          ) : leadership.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
              <Award size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p>Leadership roster is currently being assembled.</p>
            </div>
          ) : (
            leadership.map((officer) => (
              <div
                key={officer.id}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  padding: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                }}>
                  {officer.student?.studentProfile?.fullName ? officer.student.studentProfile.fullName[0] : (officer.student?.email?.[0] || 'O').toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: '1rem', fontWeight: 700 }}>
                    {officer.student?.studentProfile?.fullName || officer.student?.email}
                  </h4>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-600)', display: 'block' }}>
                    {officer.position}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Serving since {new Date(officer.startDate || officer.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB 5: ELECTIONS ────────────────────────────────── */}
      {activeTab === 'elections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tabLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading elections...</div>
          ) : elections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-default)' }}>
              <Shield size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No elections currently scheduled.</p>
            </div>
          ) : (
            elections.map((election) => (
              <div
                key={election.id}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  padding: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{election.title}</h4>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: election.status === 'OPEN' ? '#ecfdf5' : election.status === 'RESULTS_PUBLISHED' ? '#e0e7ff' : '#f1f5f9',
                      color: election.status === 'OPEN' ? '#059669' : election.status === 'RESULTS_PUBLISHED' ? '#4338ca' : '#475569',
                    }}>
                      {election.status}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    {election.description}
                  </p>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Window: {new Date(election.startAt).toLocaleString()} – {new Date(election.endAt).toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={() => navigate(`/student/clubs/${club.id}/elections/${election.id}`)}
                  className="btn btn--primary"
                  style={{ padding: '8px 18px', fontSize: '0.88rem' }}
                >
                  {election.status === 'OPEN' ? 'Enter Ballot' : election.status === 'RESULTS_PUBLISHED' ? 'View Results' : 'View Election'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB 6: MEMBERS ──────────────────────────────────── */}
      {activeTab === 'members' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}>
          {tabLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0' }}>Loading members...</div>
          ) : members.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', background: 'var(--bg-surface)' }}>
              <Users size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p>No members found.</p>
            </div>
          ) : (
            members.map((mem) => (
              <div
                key={mem.id}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: 'var(--bg-surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}>
                  {mem.student?.studentProfile?.fullName ? mem.student.studentProfile.fullName[0] : (mem.student?.email?.[0] || 'U').toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: '0.95rem', fontWeight: 700 }}>
                    {mem.student?.studentProfile?.fullName || mem.student?.email}
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Role: <strong>{mem.role}</strong>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── REPORT MODAL ────────────────────────────────────── */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16,
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: 500,
            padding: 24,
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800 }}>Report Club</h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Your report will be forwarded to the Dean & Administrators for formal review.
            </p>
            <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                  Reason & Details *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the violation, suspicious activity, or inappropriate content..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="btn btn--outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="btn btn--primary"
                  style={{ background: 'var(--color-danger-500)', borderColor: 'var(--color-danger-500)' }}
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
