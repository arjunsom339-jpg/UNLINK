import { useState, useEffect } from 'react';
import {
  Compass, Users, Shield, TrendingUp, CheckCircle, XCircle, AlertTriangle,
  Search, Filter, Plus, Clock, ExternalLink, Archive, Ban, Check, X
} from 'lucide-react';
import { clubsApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function AdminClubs() {
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('proposals'); // 'proposals' | 'all' | 'analytics' | 'elections'
  const [analytics, setAnalytics] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Rejection modal
  const [rejectingClubId, setRejectingClubId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Suspension modal
  const [suspendingClubId, setSuspendingClubId] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  // Election intervention modal
  const [cancellingElectionId, setCancellingElectionId] = useState(null);
  const [electionCancelReason, setElectionCancelReason] = useState('');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const [resClubs, resAnalytics] = await Promise.all([
        clubsApi.getAdminClubs(params),
        clubsApi.getAdminClubAnalytics(),
      ]);

      setClubs(resClubs.data?.data || []);
      setAnalytics(resAnalytics.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch admin clubs data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [search, statusFilter]);

  const handleApproveClub = async (clubId) => {
    try {
      await clubsApi.approveClub(clubId);
      toast.success('Club approved and activated for students!');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleRejectClub = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error('Please specify a rejection reason');
      return;
    }
    try {
      await clubsApi.rejectClub(rejectingClubId, { reason: rejectionReason });
      toast.success('Club proposal rejected');
      setRejectingClubId(null);
      setRejectionReason('');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    }
  };

  const handleSuspendClub = async (e) => {
    e.preventDefault();
    if (!suspensionReason.trim()) {
      toast.error('Please specify a suspension reason');
      return;
    }
    try {
      await clubsApi.suspendClub(suspendingClubId, { reason: suspensionReason });
      toast.success('Club suspended and hidden from active discovery');
      setSuspendingClubId(null);
      setSuspensionReason('');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Suspension failed');
    }
  };

  const handleArchiveClub = async (clubId) => {
    if (!window.confirm('Archive this club? It will become read-only and preserved for records.')) return;
    try {
      await clubsApi.archiveClub(clubId);
      toast.success('Club archived');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Archival failed');
    }
  };

  const handleCancelElection = async (e) => {
    e.preventDefault();
    if (!electionCancelReason.trim()) {
      toast.error('Please provide intervention reason');
      return;
    }
    try {
      await clubsApi.cancelElectionAdmin(cancellingElectionId, { reason: electionCancelReason });
      toast.success('Election cancelled by administrator');
      setCancellingElectionId(null);
      setElectionCancelReason('');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Intervention failed');
    }
  };

  const pendingProposals = clubs.filter((c) => c.status === 'PENDING_REVIEW');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}>
            <Shield size={22} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
            Club & Society Administration
          </h1>
        </div>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Regulate student chapter proposals, monitor membership analytics, and supervise elections.
        </p>
      </div>

      {/* ── Real Analytics Cards ────────────────────────────── */}
      {analytics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}>
          <div style={{ background: 'var(--bg-surface)', padding: 18, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE CLUBS</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4, color: 'var(--color-primary-600)' }}>
              {analytics.totalClubs || 0}
            </div>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: 18, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL MEMBERSHIPS</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }}>
              {analytics.totalMemberships || 0}
            </div>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: 18, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>PENDING PROPOSALS</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4, color: (analytics.pendingProposals || 0) > 0 ? '#d97706' : 'inherit' }}>
              {analytics.pendingProposals || 0}
            </div>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: 18, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE ELECTIONS</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4, color: '#059669' }}>
              {analytics.activeElections || 0}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 24,
        borderBottom: '1px solid var(--border-default)',
        paddingBottom: 2,
      }}>
        <button
          onClick={() => setActiveTab('proposals')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'proposals' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
            color: activeTab === 'proposals' ? 'var(--color-primary-600)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Clock size={16} />
          <span>Proposals & Review</span>
          {pendingProposals.length > 0 && (
            <span style={{ padding: '2px 8px', borderRadius: 12, background: '#fef3c7', color: '#b45309', fontSize: '0.75rem', fontWeight: 700 }}>
              {pendingProposals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'all' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
            color: activeTab === 'all' ? 'var(--color-primary-600)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Compass size={16} />
          <span>All Clubs ({clubs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'analytics' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
            color: activeTab === 'analytics' ? 'var(--color-primary-600)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <TrendingUp size={16} />
          <span>Category & Department Breakdown</span>
        </button>
      </div>

      {/* ── TAB 1: PROPOSALS ────────────────────────────────── */}
      {activeTab === 'proposals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pendingProposals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-default)' }}>
              <CheckCircle size={40} style={{ color: 'var(--color-accent-500)', marginBottom: 8 }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>All club proposals have been reviewed.</p>
            </div>
          ) : (
            pendingProposals.map((club) => (
              <div
                key={club.id}
                style={{
                  background: 'var(--bg-surface)',
                  padding: 22,
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div style={{ maxWidth: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, background: '#fef3c7', color: '#b45309', fontSize: '0.75rem', fontWeight: 700 }}>
                      PENDING REVIEW
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--bg-surface-2)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {club.category}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{club.name}</h3>
                  </div>

                  <p style={{ margin: '0 0 10px', fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {club.description}
                  </p>

                  <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <span>Proposed by: {club.creator?.studentProfile?.fullName || club.creator?.email || 'Student'}</span>
                    {club.contactEmail && <span>Contact: {club.contactEmail}</span>}
                    {club.meetingLocation && <span>Venue: {club.meetingLocation}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handleApproveClub(club.id)}
                    className="btn btn--primary"
                    style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                  >
                    Approve & Activate
                  </button>
                  <button
                    onClick={() => setRejectingClubId(club.id)}
                    className="btn btn--outline"
                    style={{ padding: '8px 16px', fontSize: '0.88rem', color: 'var(--color-danger-500)' }}
                  >
                    Reject Proposal
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB 2: ALL CLUBS ────────────────────────────────── */}
      {activeTab === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Search & Filter */}
          <div style={{ display: 'flex', gap: 12, background: 'var(--bg-surface)', padding: 14, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
            <input
              type="text"
              placeholder="Search clubs by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING_REVIEW">PENDING_REVIEW</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-default)' }}>
                  <th style={{ padding: '12px 16px' }}>Club Name</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Members</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clubs.map((club) => (
                  <tr key={club.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700 }}>{club.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{club.shortName}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{club.category}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 12,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: club.status === 'ACTIVE' ? '#ecfdf5' : club.status === 'PENDING_REVIEW' ? '#fef3c7' : '#f1f5f9',
                        color: club.status === 'ACTIVE' ? '#059669' : club.status === 'PENDING_REVIEW' ? '#b45309' : '#475569',
                      }}>
                        {club.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{club.memberCount || 0}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        {club.status === 'ACTIVE' && (
                          <button
                            onClick={() => setSuspendingClubId(club.id)}
                            style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                          >
                            Suspend
                          </button>
                        )}
                        {club.status !== 'ARCHIVED' && (
                          <button
                            onClick={() => handleArchiveClub(club.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: ANALYTICS ────────────────────────────────── */}
      {activeTab === 'analytics' && analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem', fontWeight: 700 }}>Clubs by Category</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(analytics.categories || []).map((cat) => (
                <div key={cat.category} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem' }}>
                  <span>{cat.category}</span>
                  <strong>{cat.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem', fontWeight: 700 }}>Clubs by Department</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(analytics.departments || []).map((dept) => (
                <div key={dept.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem' }}>
                  <span>{dept.name}</span>
                  <strong>{dept.count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT MODAL ────────────────────────────────────── */}
      {rejectingClubId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 460 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700 }}>Reject Proposal</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Provide feedback to the student founder regarding why this proposal was rejected.</p>
            <form onSubmit={handleRejectClub} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <textarea
                required
                rows={3}
                placeholder="Reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setRejectingClubId(null)} className="btn btn--outline">Cancel</button>
                <button type="submit" className="btn btn--primary" style={{ background: 'var(--color-danger-500)', borderColor: 'var(--color-danger-500)' }}>Reject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SUSPEND MODAL ───────────────────────────────────── */}
      {suspendingClubId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 460 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700 }}>Suspend Club</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>This club will be removed from discovery and restricted pending disciplinary review.</p>
            <form onSubmit={handleSuspendClub} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <textarea
                required
                rows={3}
                placeholder="Reason for suspension..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setSuspendingClubId(null)} className="btn btn--outline">Cancel</button>
                <button type="submit" className="btn btn--primary" style={{ background: '#d97706', borderColor: '#d97706' }}>Suspend</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
