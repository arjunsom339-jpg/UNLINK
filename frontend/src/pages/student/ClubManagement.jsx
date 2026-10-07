import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Settings, Users, Megaphone, Activity, Shield, Award, Plus,
  Trash2, Edit3, Check, X, CheckCircle, AlertTriangle, ArrowLeft,
  Calendar, MapPin, Eye, Lock, FileText, Vote, Sparkles
} from 'lucide-react';
import { clubsApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function ClubManagement() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard'); // dashboard | requests | members | announcements | activities | elections | leadership | settings

  // Sub-resources
  const [membershipRequests, setMembershipRequests] = useState([]);
  const [members, setMembers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [elections, setElections] = useState([]);
  const [leadership, setLeadership] = useState([]);

  // Modals & form state
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', content: '', pinned: false });

  const [showActModal, setShowActModal] = useState(false);
  const [actForm, setActForm] = useState({
    title: '',
    description: '',
    activityType: 'MEETING',
    location: '',
    startAt: '',
    endAt: '',
    capacity: '',
    visibility: 'CLUB_ONLY',
  });

  const [showElectionModal, setShowElectionModal] = useState(false);
  const [electionForm, setElectionForm] = useState({
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    positionTitle: 'President',
  });

  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [officerForm, setOfficerForm] = useState({
    studentId: '',
    position: 'Vice President',
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    description: '',
    meetingLocation: '',
    meetingSchedule: '',
    contactEmail: '',
    website: '',
    membershipApprovalRequired: true,
  });

  const fetchClubAndScope = async () => {
    try {
      setLoading(true);
      const resClub = await clubsApi.getClubById(id);
      const c = resClub.data?.data;
      setClub(c);

      setSettingsForm({
        description: c.description || '',
        meetingLocation: c.meetingLocation || '',
        meetingSchedule: c.meetingSchedule || '',
        contactEmail: c.contactEmail || '',
        website: c.website || '',
        membershipApprovalRequired: !!c.membershipApprovalRequired,
      });

      // Load resources in parallel
      const [resReqs, resMems, resAnns, resActs, resElec, resLead] = await Promise.all([
        clubsApi.getMembershipRequests(id),
        clubsApi.getClubMembers(id),
        clubsApi.getAnnouncements(id),
        clubsApi.getActivities(id),
        clubsApi.getElections(id),
        clubsApi.getClubLeadership(id),
      ]);

      setMembershipRequests(resReqs.data?.data || []);
      setMembers(resMems.data?.data || []);
      setAnnouncements(resAnns.data?.data || []);
      setActivities(resActs.data?.data || []);
      setElections(resElec.data?.data || []);
      setLeadership(resLead.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Access denied or club not found.');
      navigate(`/student/clubs/${id}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubAndScope();
  }, [id]);

  // Handlers for Requests
  const handleApproveRequest = async (reqId) => {
    try {
      await clubsApi.approveMembershipRequest(reqId);
      toast.success('Membership approved!');
      fetchClubAndScope();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleRejectRequest = async (reqId) => {
    const reason = window.prompt('Reason for rejection (optional):');
    try {
      await clubsApi.rejectMembershipRequest(reqId, { reason });
      toast.success('Membership rejected');
      fetchClubAndScope();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    }
  };

  // Handlers for Announcements
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await clubsApi.createAnnouncement(id, annForm);
      toast.success('Announcement published and members notified!');
      setShowAnnModal(false);
      setAnnForm({ title: '', content: '', pinned: false });
      fetchClubAndScope();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post announcement');
    }
  };

  const handleDeleteAnnouncement = async (annId) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await clubsApi.deleteAnnouncement(annId);
      toast.success('Announcement deleted');
      fetchClubAndScope();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // Handlers for Activities
  const handleCreateActivity = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...actForm,
        startAt: new Date(actForm.startAt).toISOString(),
        endAt: actForm.endAt ? new Date(actForm.endAt).toISOString() : null,
        capacity: actForm.capacity ? parseInt(actForm.capacity) : null,
      };
      await clubsApi.createActivity(id, payload);
      toast.success('Activity scheduled!');
      setShowActModal(false);
      setActForm({
        title: '',
        description: '',
        activityType: 'MEETING',
        location: '',
        startAt: '',
        endAt: '',
        capacity: '',
        visibility: 'CLUB_ONLY',
      });
      fetchClubAndScope();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create activity');
    }
  };

  const handleDeleteActivity = async (actId) => {
    if (!window.confirm('Delete this activity?')) return;
    try {
      await clubsApi.deleteActivity(actId);
      toast.success('Activity deleted');
      fetchClubAndScope();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // Handlers for Officers
  const handleAppointOfficer = async (e) => {
    e.preventDefault();
    try {
      await clubsApi.appointOfficer(id, officerForm);
      toast.success('Officer appointed successfully!');
      setShowOfficerModal(false);
      setOfficerForm({ studentId: '', position: 'Vice President' });
      fetchClubAndScope();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Appointment failed');
    }
  };

  const handleRemoveOfficer = async (officerId) => {
    if (!window.confirm('Remove this officer appointment?')) return;
    try {
      await clubsApi.removeOfficer(officerId);
      toast.success('Officer appointment revoked');
      fetchClubAndScope();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Revocation failed');
    }
  };

  // Handlers for Elections
  const handleCreateElection = async (e) => {
    e.preventDefault();
    try {
      const elecRes = await clubsApi.createElection(id, {
        title: electionForm.title,
        description: electionForm.description,
        startAt: new Date(electionForm.startAt).toISOString(),
        endAt: new Date(electionForm.endAt).toISOString(),
      });
      const createdElec = elecRes.data?.data;

      // Add default initial position
      if (electionForm.positionTitle) {
        await clubsApi.addElectionPosition(createdElec.id, {
          title: electionForm.positionTitle,
          maxWinners: 1,
        });
      }

      toast.success('Election created in Draft status. You can now add positions & candidates!');
      setShowElectionModal(false);
      setElectionForm({ title: '', description: '', startAt: '', endAt: '', positionTitle: 'President' });
      fetchClubAndScope();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create election');
    }
  };

  const handleOpenElection = async (electionId) => {
    try {
      await clubsApi.openElection(electionId);
      toast.success('Election is now OPEN for student voting!');
      fetchClubAndScope();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot open election (ensure approved candidates exist)');
    }
  };

  const handleCloseElection = async (electionId) => {
    try {
      await clubsApi.closeElection(electionId);
      toast.success('Election voting closed');
      fetchClubAndScope();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Close failed');
    }
  };

  const handlePublishResults = async (electionId) => {
    try {
      await clubsApi.publishElectionResults(electionId);
      toast.success('Election results published to members!');
      fetchClubAndScope();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Publication failed');
    }
  };

  // Handlers for Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await clubsApi.updateClub(id, settingsForm);
      toast.success('Club settings updated!');
      fetchClubAndScope();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  if (loading || !club) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <p>Loading Leadership Console...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* ── Top Header ──────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid var(--border-default)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate(`/student/clubs/${id}`)}
            style={{
              background: 'none',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '2px 8px',
                borderRadius: 6,
                background: 'var(--color-primary-100)',
                color: 'var(--color-primary-700)',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}>
                LEADERSHIP CONSOLE
              </span>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
                {club.name}
              </h1>
            </div>
            <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Manage membership, announcements, internal activities, and elections
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/student/clubs/${id}`)}
          className="btn btn--outline"
          style={{ fontSize: '0.85rem' }}
        >
          View Public Page
        </button>
      </div>

      {/* ── Management Tabs ─────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 24,
        borderBottom: '1px solid var(--border-default)',
        paddingBottom: 2,
        overflowX: 'auto',
      }}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Settings },
          { id: 'requests', label: `Requests (${membershipRequests.length})`, icon: Users },
          { id: 'members', label: `Roster (${members.length})`, icon: Users },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
          { id: 'activities', label: 'Activities', icon: Activity },
          { id: 'elections', label: 'Elections', icon: Shield },
          { id: 'leadership', label: 'Officers', icon: Award },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: activeSection === sec.id ? '2px solid var(--color-primary-600)' : '2px solid transparent',
              color: activeSection === sec.id ? 'var(--color-primary-600)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap',
            }}
          >
            <sec.icon size={16} />
            <span>{sec.label}</span>
          </button>
        ))}
      </div>

      {/* ── SECTION: DASHBOARD ──────────────────────────────── */}
      {activeSection === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL MEMBERS</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }}>{members.length}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>PENDING APPLICATIONS</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4, color: membershipRequests.length > 0 ? '#d97706' : 'inherit' }}>
                {membershipRequests.length}
              </div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ANNOUNCEMENTS</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }}>{announcements.length}</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVITIES / WORKSHOPS</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }}>{activities.length}</div>
            </div>
          </div>

          {/* Pending Requests Preview */}
          {membershipRequests.length > 0 && (
            <div style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Pending Membership Applications</h3>
                <button onClick={() => setActiveSection('requests')} className="btn btn--outline" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                  View All
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {membershipRequests.slice(0, 3).map((req) => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <strong>{req.student?.studentProfile?.fullName || req.student?.email}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                        Applied on {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleApproveRequest(req.id)} className="btn btn--primary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                        Approve
                      </button>
                      <button onClick={() => handleRejectRequest(req.id)} className="btn btn--outline" style={{ padding: '4px 10px', fontSize: '0.78rem', color: 'var(--color-danger-500)' }}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION: REQUESTS ───────────────────────────────── */}
      {activeSection === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {membershipRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-default)' }}>
              <CheckCircle size={40} style={{ color: 'var(--color-accent-500)', marginBottom: 8 }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No pending membership requests to review.</p>
            </div>
          ) : (
            membershipRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  background: 'var(--bg-surface)',
                  padding: 18,
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: '1.02rem', fontWeight: 700 }}>
                    {req.student?.studentProfile?.fullName || req.student?.email}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    USN: {req.student?.studentProfile?.usn || 'N/A'} • Sem {req.student?.studentProfile?.semester || 'N/A'} • Applied {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => handleApproveRequest(req.id)} className="btn btn--primary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                    Approve
                  </button>
                  <button onClick={() => handleRejectRequest(req.id)} className="btn btn--outline" style={{ padding: '6px 14px', fontSize: '0.85rem', color: 'var(--color-danger-500)' }}>
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── SECTION: MEMBERS ROSTER ─────────────────────────── */}
      {activeSection === 'members' && (
        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-default)' }}>
                <th style={{ padding: '12px 16px' }}>Student</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Joined Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((mem) => (
                <tr key={mem.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{mem.student?.studentProfile?.fullName || mem.student?.email}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{mem.student?.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: mem.role === 'PRESIDENT' ? '#fef3c7' : '#ecfdf5',
                      color: mem.role === 'PRESIDENT' ? '#b45309' : '#059669',
                    }}>
                      {mem.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {new Date(mem.joinedAt || mem.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {mem.role !== 'PRESIDENT' && (
                      <button
                        onClick={async () => {
                          if (window.confirm(`Suspend member ${mem.student?.studentProfile?.fullName || mem.student?.email}?`)) {
                            await clubsApi.suspendMember(mem.id, { reason: 'Violated conduct' });
                            toast.success('Member suspended');
                            fetchClubAndScope();
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--color-danger-500)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SECTION: ANNOUNCEMENTS ──────────────────────────── */}
      {activeSection === 'announcements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAnnModal(true)} className="btn btn--primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} />
              <span>Create Announcement</span>
            </button>
          </div>

          {announcements.map((ann) => (
            <div key={ann.id} style={{ background: 'var(--bg-surface)', padding: 18, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{ann.title}</h4>
                  {ann.pinned && (
                    <span style={{ padding: '2px 8px', borderRadius: 12, background: 'var(--color-primary-100)', color: 'var(--color-primary-700)', fontSize: '0.72rem', fontWeight: 700 }}>
                      PINNED
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{ann.content}</p>
              </div>
              <button onClick={() => handleDeleteAnnouncement(ann.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger-500)', cursor: 'pointer' }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION: ACTIVITIES ─────────────────────────────── */}
      {activeSection === 'activities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowActModal(true)} className="btn btn--primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} />
              <span>Schedule Activity</span>
            </button>
          </div>

          {activities.map((act) => (
            <div key={act.id} style={{ background: 'var(--bg-surface)', padding: 18, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--bg-surface-2)', fontSize: '0.75rem', fontWeight: 700 }}>
                    {act.activityType}
                  </span>
                  <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700 }}>{act.title}</h4>
                  <span style={{ padding: '2px 8px', borderRadius: 6, background: act.visibility === 'CLUB_ONLY' ? '#fef3c7' : '#ecfdf5', color: act.visibility === 'CLUB_ONLY' ? '#b45309' : '#059669', fontSize: '0.72rem', fontWeight: 700 }}>
                    {act.visibility}
                  </span>
                </div>
                <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{act.description}</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(act.startAt).toLocaleString()} • {act.location || 'Online'}
                </span>
              </div>
              <button onClick={() => handleDeleteActivity(act.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger-500)', cursor: 'pointer' }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION: ELECTIONS ──────────────────────────────── */}
      {activeSection === 'elections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowElectionModal(true)} className="btn btn--primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} />
              <span>Initiate Election</span>
            </button>
          </div>

          {elections.map((elec) => (
            <div key={elec.id} style={{ background: 'var(--bg-surface)', padding: 18, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{elec.title}</h4>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, background: '#f1f5f9' }}>
                    {elec.status}
                  </span>
                </div>
                <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{elec.description}</p>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Window: {new Date(elec.startAt).toLocaleString()} – {new Date(elec.endAt).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {elec.status === 'DRAFT' && (
                  <button onClick={() => handleOpenElection(elec.id)} className="btn btn--primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    Open Ballot
                  </button>
                )}
                {elec.status === 'OPEN' && (
                  <button onClick={() => handleCloseElection(elec.id)} className="btn btn--outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    Close Voting
                  </button>
                )}
                {elec.status === 'CLOSED' && (
                  <button onClick={() => handlePublishResults(elec.id)} className="btn btn--primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    Publish Results
                  </button>
                )}
                <button
                  onClick={() => navigate(`/student/clubs/${club.id}/elections/${elec.id}`)}
                  className="btn btn--secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION: LEADERSHIP OFFICERS ────────────────────── */}
      {activeSection === 'leadership' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowOfficerModal(true)} className="btn btn--primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} />
              <span>Appoint Officer</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {leadership.map((officer) => (
              <div key={officer.id} style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: '1rem', fontWeight: 700 }}>
                    {officer.student?.studentProfile?.fullName || officer.student?.email}
                  </h4>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                    {officer.position}
                  </span>
                </div>
                <button onClick={() => handleRemoveOfficer(officer.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger-500)', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION: SETTINGS ───────────────────────────────── */}
      {activeSection === 'settings' && (
        <form onSubmit={handleSaveSettings} style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Description</label>
            <textarea
              rows={4}
              value={settingsForm.description}
              onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Meeting Location</label>
              <input
                type="text"
                value={settingsForm.meetingLocation}
                onChange={(e) => setSettingsForm({ ...settingsForm, meetingLocation: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Meeting Schedule</label>
              <input
                type="text"
                value={settingsForm.meetingSchedule}
                onChange={(e) => setSettingsForm({ ...settingsForm, meetingSchedule: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Contact Email</label>
              <input
                type="email"
                value={settingsForm.contactEmail}
                onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Website</label>
              <input
                type="url"
                value={settingsForm.website}
                onChange={(e) => setSettingsForm({ ...settingsForm, website: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settingsForm.membershipApprovalRequired}
              onChange={(e) => setSettingsForm({ ...settingsForm, membershipApprovalRequired: e.target.checked })}
            />
            <span>Require Leadership Approval for Joining</span>
          </label>

          <button type="submit" className="btn btn--primary" style={{ alignSelf: 'flex-start', marginTop: 8 }}>
            Save Changes
          </button>
        </form>
      )}

      {/* ── MODAL: CREATE ANNOUNCEMENT ───────────────────────── */}
      {showAnnModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 500 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.2rem', fontWeight: 700 }}>Post Announcement</h3>
            <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Title *</label>
                <input required type="text" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Content *</label>
                <textarea required rows={4} value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                <input type="checkbox" checked={annForm.pinned} onChange={(e) => setAnnForm({ ...annForm, pinned: e.target.checked })} />
                <span>Pin to top</span>
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowAnnModal(false)} className="btn btn--outline">Cancel</button>
                <button type="submit" className="btn btn--primary">Post</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SCHEDULE ACTIVITY ────────────────────────── */}
      {showActModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.2rem', fontWeight: 700 }}>Schedule Internal Activity</h3>
            <form onSubmit={handleCreateActivity} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Title *</label>
                <input required type="text" value={actForm.title} onChange={(e) => setActForm({ ...actForm, title: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Activity Type</label>
                  <select value={actForm.activityType} onChange={(e) => setActForm({ ...actForm, activityType: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}>
                    <option value="MEETING">MEETING</option>
                    <option value="WORKSHOP">WORKSHOP</option>
                    <option value="COMPETITION">COMPETITION</option>
                    <option value="PROJECT">PROJECT</option>
                    <option value="OUTREACH">OUTREACH</option>
                    <option value="PRACTICE">PRACTICE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Visibility</label>
                  <select value={actForm.visibility} onChange={(e) => setActForm({ ...actForm, visibility: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}>
                    <option value="CLUB_ONLY">Club Members Only</option>
                    <option value="COLLEGE">Entire College</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Start Date & Time *</label>
                <input required type="datetime-local" value={actForm.startAt} onChange={(e) => setActForm({ ...actForm, startAt: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Location / Room</label>
                <input type="text" value={actForm.location} onChange={(e) => setActForm({ ...actForm, location: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowActModal(false)} className="btn btn--outline">Cancel</button>
                <button type="submit" className="btn btn--primary">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE ELECTION ──────────────────────────── */}
      {showElectionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.2rem', fontWeight: 700 }}>Initiate Club Election</h3>
            <form onSubmit={handleCreateElection} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Election Title *</label>
                <input required type="text" placeholder="e.g. Spring 2026 Executive Board Election" value={electionForm.title} onChange={(e) => setElectionForm({ ...electionForm, title: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Voting Start Date *</label>
                  <input required type="datetime-local" value={electionForm.startAt} onChange={(e) => setElectionForm({ ...electionForm, startAt: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Voting End Date *</label>
                  <input required type="datetime-local" value={electionForm.endAt} onChange={(e) => setElectionForm({ ...electionForm, endAt: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Initial Position Contested</label>
                <input type="text" placeholder="e.g. President" value={electionForm.positionTitle} onChange={(e) => setElectionForm({ ...electionForm, positionTitle: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowElectionModal(false)} className="btn btn--outline">Cancel</button>
                <button type="submit" className="btn btn--primary">Create Election</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: APPOINT OFFICER ──────────────────────────── */}
      {showOfficerModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.2rem', fontWeight: 700 }}>Appoint Club Officer</h3>
            <form onSubmit={handleAppointOfficer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Select Member *</label>
                <select
                  required
                  value={officerForm.studentId}
                  onChange={(e) => setOfficerForm({ ...officerForm, studentId: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
                >
                  <option value="">-- Choose active member --</option>
                  {members.map((m) => (
                    <option key={m.studentId} value={m.studentId}>
                      {m.student?.studentProfile?.fullName || m.student?.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Position Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Vice President, Secretary, Technical Lead"
                  value={officerForm.position}
                  onChange={(e) => setOfficerForm({ ...officerForm, position: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowOfficerModal(false)} className="btn btn--outline">Cancel</button>
                <button type="submit" className="btn btn--primary">Appoint</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
